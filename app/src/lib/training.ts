// Verbindet die Kraft-Engine mit der lokalen Datenbank.
import { todayReadiness, withPainRegions } from './checkinStore';
import { isDeloadToday } from './weekStore';
import { db, getMeta, plain, setMeta, type CoachDB } from './db';
import type { Readiness } from './readiness';
import { PATTERNS } from './exercises';
import {
  buildSession, calibrationDue, initialState, progress, swapAfterFeedback, updateRirOffset, type Change
} from './strength';
import type {
  ChangeLogEntry, FeedbackReason, PainEntry, PatternId, PatternState, Profile, SetLog, StrengthSession
} from './types';

const rirKey = (pid: string) => `rirOffset:${pid}`;
const calKey = (pid: string) => `lastCalibrationAt:${pid}`;

export const getRirOffset = (pid: string, d: CoachDB = db) => getMeta<number>(rirKey(pid), 0, d);
export const getLastCalibration = (pid: string, d: CoachDB = db) => getMeta<string | null>(calKey(pid), null, d);

/** Lädt die Musterzustände und legt fehlende mit Startstufe nach Erfahrung an. */
export async function ensureStates(p: Profile, d: CoachDB = db): Promise<PatternState[]> {
  const existing = await d.patternStates.where('profileId').equals(p.id).toArray();
  const have = new Set(existing.map((s) => s.pattern));
  const created: PatternState[] = [];
  for (const pat of PATTERNS) {
    if (have.has(pat.id)) continue;
    const s = initialState(pat.id, p);
    if (s) created.push(s);
  }
  if (created.length) await d.patternStates.bulkPut(created);
  return [...existing, ...created];
}

export async function activeSession(pid: string, d: CoachDB = db): Promise<StrengthSession | null> {
  const list = await d.sessions.where('profileId').equals(pid).filter((s) => s.status === 'active').toArray();
  return list.sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0] ?? null;
}

export async function recentSessions(pid: string, days: number, d: CoachDB = db): Promise<StrengthSession[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return d.sessions.where('profileId').equals(pid)
    .filter((s) => s.status === 'done' && s.startedAt >= since).toArray();
}

/**
 * Plant eine Krafteinheit unter Berücksichtigung der heutigen Tagesform (F4, F5, F12):
 * Schmerzregionen werden ausgeschlossen, Gelb/Rot erhöht die Mindest-Reserve,
 * Rot verkürzt auf eine leichte Einheit, keine Kalibrierung/Intensivierung ohne Grün.
 */
export async function planSession(p: Profile, minutes: number, d: CoachDB = db, r?: Readiness | null) {
  const ready = r === undefined ? await todayReadiness(p, d) : r;
  const eff = withPainRegions(p, ready);
  const states = await ensureStates(p, d);
  const recent = await recentSessions(p.id, 7, d);
  const rirOffset = await getRirOffset(p.id, d);
  const caps = ready?.caps;
  const deload = await isDeloadToday(p, d);
  const calibrate = calibrationDue(await getLastCalibration(p.id, d)) && !caps?.noIntensity && !deload;
  const mins = caps?.recoveryOnly ? Math.min(minutes, 20) : minutes;
  const volumeBoost = await getMeta<number>(`volumeBoost:${p.id}`, 0, d);
  const plan = buildSession(eff, states, recent, mins, { rirOffset, calibrate, volumeBoost });
  if (!caps && !deload) return plan;
  return plan.map((x) => {
    let sets = caps?.recoveryOnly ? Math.min(x.sets, 2) : x.sets;
    let minRir = caps && caps.minRir > 1 ? caps.minRir : undefined;
    if (deload) {
      // F13: ~40–50 % weniger Sätze, gleiche Übungen, RIR +2
      sets = Math.max(1, Math.ceil(sets / 2));
      minRir = Math.max(minRir ?? 0, 3);
    }
    return { ...x, sets, minRir, deload: deload || undefined, technique: caps?.noIntensity || deload ? undefined : x.technique };
  });
}

export async function startSession(p: Profile, minutes: number, d: CoachDB = db): Promise<StrengthSession> {
  const plan = await planSession(p, minutes, d);
  const s: StrengthSession = {
    id: crypto.randomUUID(), profileId: p.id, kind: 'strength', status: 'active',
    startedAt: new Date().toISOString(), plannedMinutes: minutes, plan, sets: []
  };
  await d.sessions.put(plain(s));
  return s;
}

export async function saveSession(s: StrengthSession, d: CoachDB = db): Promise<void> {
  await d.sessions.put(plain(s));
}

export async function discardSession(id: string, d: CoachDB = db): Promise<void> {
  await d.sessions.delete(id);
}

async function logChanges(pid: string, changes: Change[], sessionId: string | undefined, d: CoachDB) {
  const at = new Date().toISOString();
  const entries: ChangeLogEntry[] = changes.map((c) => ({
    profileId: pid, at, ruleId: c.ruleId, what: c.what, why: c.why,
    prev: plain(c.prev), next: plain(c.next), sessionId
  }));
  const ids = await d.changes.bulkAdd(entries, { allKeys: true });
  return entries.map((e, i) => ({ ...e, id: ids[i] as number }));
}

/** Abschluss: Progression je Muster, Kalibrierung, Änderungsprotokoll. */
export async function finishSession(
  p: Profile, s: StrengthSession, feedback: { sRpe: number; enjoyment: number; pain: PainEntry[] },
  d: CoachDB = db
): Promise<ChangeLogEntry[]> {
  const date = new Date().toISOString();
  let offset = await getRirOffset(p.id, d);
  const cal = s.sets.find((x) => x.calibration);
  if (cal?.calibration) {
    offset = updateRirOffset(offset, cal.calibration);
    await setMeta(rirKey(p.id), offset, d);
    await setMeta(calKey(p.id), date, d);
  }
  const states = await ensureStates(p, d);
  const changes: Change[] = [];
  for (const st of states) {
    const sets = s.sets.filter((x) => x.pattern === st.pattern);
    if (!sets.length) continue;
    // Einheiten mit Tagesform-Deckel (bewusst mehr Reserve) nicht für Stufenwechsel werten
    const capped = s.plan.find((x) => x.pattern === st.pattern)?.minRir;
    if (capped && capped >= 2) continue;
    const r = progress(st, sets, p, offset, date.slice(0, 10));
    await d.patternStates.put(plain(r.state));
    if (r.change) changes.push(r.change);
  }
  const done: StrengthSession = { ...s, status: 'done', finishedAt: date, ...feedback };
  await d.sessions.put(plain(done));
  return logChanges(p.id, changes, s.id, d);
}

/** Einstufung eines Musters abschließen. */
export async function setPlacement(state: PatternState, d: CoachDB = db): Promise<void> {
  await d.patternStates.put(plain({ ...state, placed: true, history: [], technique: undefined }));
}

export async function giveFeedback(
  p: Profile, pattern: PatternId, reason: FeedbackReason, note: string, d: CoachDB = db
): Promise<{ state: PatternState; entry: ChangeLogEntry } | null> {
  const states = await ensureStates(p, d);
  const st = states.find((x) => x.pattern === pattern);
  if (!st) return null;
  await d.feedback.add({
    profileId: p.id, exerciseId: st.step.exerciseId, bandLevel: st.step.bandLevel, reason, note,
    at: new Date().toISOString()
  });
  const r = swapAfterFeedback(st, reason, p);
  if (!r) return null;
  await d.patternStates.put(plain(r.state));
  const [entry] = await logChanges(p.id, [r.change], undefined, d);
  return { state: r.state, entry: entry! };
}

/** Änderung rückgängig machen (F21): vorherigen Zustand wiederherstellen. */
export async function undoChange(id: number, d: CoachDB = db): Promise<boolean> {
  const c = await d.changes.get(id);
  if (!c?.prev || c.undone) return false;
  const current = await d.patternStates.get(c.prev.id);
  // nur zurücksetzen, wenn seither nichts anderes geändert wurde
  if (current && c.next && JSON.stringify(current.step) !== JSON.stringify(c.next.step)) return false;
  await d.patternStates.put(plain(c.prev));
  await d.changes.update(id, { undone: true });
  return true;
}

export async function recentChanges(pid: string, limit = 20, d: CoachDB = db): Promise<ChangeLogEntry[]> {
  const all = await d.changes.where('profileId').equals(pid).toArray();
  return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export async function feedbackExport(pid: string, d: CoachDB = db) {
  return d.feedback.where('profileId').equals(pid).toArray();
}

export function setWithin(s: StrengthSession, set: SetLog): StrengthSession {
  return { ...s, sets: [...s.sets, set] };
}
