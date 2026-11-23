// Wochenplan: anlegen, an Zeitänderungen anpassen, Entlastungswochen, Zeit-Lernen, Rückgängig.
import { checkinHistory } from './checkinStore';
import { db, getMeta, plain, setMeta, type CoachDB } from './db';
import { strengthMinutes } from './endurance';
import { listEndurance } from './enduranceStore';
import {
  addDays, deloadDecision, defaultAvailability, fatigueSignals, learnAvailability, mondayOf, planWeek,
  weeksBetween, type WeekRecord
} from './planner';
import { readiness, todayKey } from './readiness';
import type { ChangeLogEntry, DayPlan, EnduranceType, PlannedItem, Profile, WeekPlan } from './types';

const blockKey = (pid: string) => `blockStart:${pid}`;
const learnedKey = (pid: string) => `learnedAvail:${pid}`;
const deloadOverrideKey = (pid: string, week: string) => `deloadOverride:${pid}:${week}`;

async function log(d: CoachDB, e: Omit<ChangeLogEntry, 'at'>): Promise<number> {
  return (await d.changes.add({ ...e, at: new Date().toISOString() })) as number;
}

export async function getBlockStart(p: Profile, d: CoachDB = db): Promise<string> {
  return getMeta<string>(blockKey(p.id), mondayOf(todayKey(new Date(p.createdAt))), d);
}

/** Tatsächlich trainierte Minuten je Wochentag einer Woche. */
async function actualMinutes(p: Profile, weekStart: string, d: CoachDB): Promise<number[]> {
  const out = [0, 0, 0, 0, 0, 0, 0];
  const end = addDays(weekStart, 7);
  const strength = await d.sessions.where('profileId').equals(p.id).filter((s) => s.status === 'done' && s.kind === 'strength').toArray();
  for (const s of strength) {
    const day = todayKey(new Date(s.startedAt));
    if (day >= weekStart && day < end) out[weeksDay(weekStart, day)]! += strengthMinutes(s);
  }
  const endu = await d.endurance.where('profileId').equals(p.id).toArray();
  for (const s of endu) {
    const day = todayKey(new Date(s.date));
    if (day >= weekStart && day < end) out[weeksDay(weekStart, day)]! += s.durationMin;
  }
  return out;
}
const weeksDay = (weekStart: string, day: string) =>
  Math.round((new Date(`${day}T12:00:00`).getTime() - new Date(`${weekStart}T12:00:00`).getTime()) / 86400000);

/** Zeit-Lernen aus den letzten 4 Wochen (wird beim Anlegen einer neuen Woche ausgeführt). */
async function maybeLearn(p: Profile, weekStart: string, d: CoachDB): Promise<number[] | null> {
  const learned = await getMeta<number[] | null>(learnedKey(p.id), null, d);
  const base = defaultAvailability(p, learned);
  const records: WeekRecord[] = [];
  for (let w = 4; w >= 1; w--) {
    const ws = addDays(weekStart, -7 * w);
    const plan = await d.weeks.get(`${p.id}:${ws}`);
    if (!plan) continue;
    records.push({
      planned: plan.days.map((x) => x.items.reduce((t, i) => t + i.minutes, 0)),
      done: await actualMinutes(p, ws, d)
    });
  }
  const r = learnAvailability(base, records);
  if (!r) return learned;
  await setMeta(learnedKey(p.id), r.avail, d);
  await log(d, {
    profileId: p.id, ruleId: 'F21', kind: 'availability', prevData: learned,
    what: 'Standardwoche angepasst', why: `Gelernt aus den letzten Wochen: ${r.changes.join('; ')}.`
  });
  return r.avail;
}

async function decideDeload(p: Profile, weekStart: string, d: CoachDB): Promise<{ deload: boolean; reason: string; blockWeek: number }> {
  // Nach einer Entlastungswoche beginnt ein neuer Block (F24)
  const prev = await d.weeks.get(`${p.id}:${addDays(weekStart, -7)}`);
  if (prev?.deload) await setMeta(blockKey(p.id), weekStart, d);
  const blockStart = await getBlockStart(p, d);
  const blockWeek = Math.max(1, weeksBetween(blockStart, weekStart) + 1);
  const override = await getMeta<boolean | null>(deloadOverrideKey(p.id, weekStart), null, d);

  const since = new Date(Date.now() - 10 * 86400000);
  const checkins = (await checkinHistory(p.id, 10, d));
  const hist = await checkinHistory(p.id, 40, d);
  const last7 = checkins.filter((c) => c.date >= todayKey(new Date(Date.now() - 7 * 86400000)));
  const lights = last7.map((c) => readiness(c, hist, p).light);
  const strength = await d.sessions.where('profileId').equals(p.id).filter((s) => s.status === 'done' && new Date(s.startedAt) >= since).toArray();
  const endurance = (await listEndurance(p.id, d)).filter((s) => new Date(s.date) >= since);
  const signals = fatigueSignals({ lights, strength, endurance, checkins });
  const greenRatio = lights.length >= 4 ? lights.filter((l) => l === 'green').length / lights.length : 0.5;
  const dec = deloadDecision(p, blockWeek, signals, greenRatio);
  if (override !== null) {
    return { deload: override, blockWeek, reason: override ? 'Entlastungswoche von dir gewählt.' : 'Entlastungswoche von dir verschoben.' };
  }
  return { ...dec, blockWeek };
}

/** Lädt die Woche oder legt sie an. */
export async function getWeek(p: Profile, weekStart = mondayOf(todayKey()), d: CoachDB = db): Promise<WeekPlan> {
  const existing = await d.weeks.get(`${p.id}:${weekStart}`);
  if (existing) return existing;
  const learned = await maybeLearn(p, weekStart, d);
  const avail = defaultAvailability(p, learned);
  const dec = await decideDeload(p, weekStart, d);
  const today = todayKey();
  const { days, why } = planWeek(p, avail, { weekStart, deload: dec.deload, fromDate: today > weekStart ? today : weekStart });
  const now = new Date().toISOString();
  const w: WeekPlan = {
    id: `${p.id}:${weekStart}`, profileId: p.id, weekStart, days, deload: dec.deload, blockWeek: dec.blockWeek,
    why: dec.reason ? [dec.reason, ...why] : why, createdAt: now, updatedAt: now
  };
  await d.weeks.put(plain(w));
  if (dec.deload) {
    await log(d, { profileId: p.id, ruleId: 'F13', kind: 'deload', prevData: weekStart, what: 'Entlastungswoche geplant', why: dec.reason });
  }
  return w;
}

/** Plant die restlichen Tage neu (ab heute), behält Vergangenes und Nutzer-Änderungen. */
async function replan(p: Profile, w: WeekPlan, d: CoachDB, why?: string): Promise<WeekPlan> {
  const today = todayKey();
  const from = today > w.weekStart ? today : w.weekStart;
  const { days, why: w2 } = planWeek(p, w.days.map((x) => x.availableMin), { weekStart: w.weekStart, deload: w.deload, fromDate: from, keep: w.days });
  const next: WeekPlan = { ...w, days, why: why ? [why, ...w2] : w2, updatedAt: new Date().toISOString() };
  await d.weeks.put(plain(next));
  return next;
}

export async function setAvailability(p: Profile, w: WeekPlan, date: string, minutes: number, d: CoachDB = db): Promise<WeekPlan> {
  const days = w.days.map((x) => (x.date === date ? { ...x, availableMin: minutes, items: x.items.filter((i) => !i.userEdited || minutes > 0) } : x));
  return replan(p, { ...w, days }, d, 'Zeit geändert – restliche Woche neu verteilt. Verpasstes wird nicht nachgeholt, sondern umverteilt.');
}

export async function moveItem(p: Profile, w: WeekPlan, itemId: string, toDate: string, d: CoachDB = db): Promise<WeekPlan> {
  let item: PlannedItem | undefined;
  const days: DayPlan[] = w.days.map((x) => {
    const found = x.items.find((i) => i.id === itemId);
    if (found) item = found;
    return { ...x, items: x.items.filter((i) => i.id !== itemId) };
  });
  if (!item) return w;
  const target = days.find((x) => x.date === toDate);
  if (!target) return w;
  target.items.push({ ...item, userEdited: true });
  target.availableMin = Math.max(target.availableMin, target.items.reduce((t, i) => t + i.minutes, 0));
  const next = { ...w, days, updatedAt: new Date().toISOString() };
  await d.weeks.put(plain(next));
  return next;
}

export async function editItem(w: WeekPlan, itemId: string, patch: { type?: EnduranceType; minutes?: number; remove?: boolean }, d: CoachDB = db): Promise<WeekPlan> {
  const days = w.days.map((x) => ({
    ...x,
    items: patch.remove
      ? x.items.filter((i) => i.id !== itemId)
      : x.items.map((i) => (i.id === itemId ? { ...i, ...patch, userEdited: true } : i))
  }));
  const next = { ...w, days, updatedAt: new Date().toISOString() };
  await d.weeks.put(plain(next));
  return next;
}

/** Entlastungswoche ein-/ausschalten (Nutzer übersteuert, F21). */
export async function setDeload(p: Profile, w: WeekPlan, on: boolean, d: CoachDB = db): Promise<WeekPlan> {
  await setMeta(deloadOverrideKey(p.id, w.weekStart), on, d);
  await log(d, {
    profileId: p.id, ruleId: 'F21', kind: 'deload', prevData: w.weekStart,
    what: on ? 'Entlastungswoche eingeschoben' : 'Entlastungswoche verschoben', why: 'Von dir übersteuert.'
  });
  return replan(p, { ...w, deload: on }, d, on ? 'Entlastungswoche von dir eingeschoben.' : 'Entlastungswoche von dir verschoben.');
}

/** Wochenplan komplett neu erstellen (z. B. nach Profiländerung). */
export async function rebuildWeek(p: Profile, w: WeekPlan, d: CoachDB = db): Promise<WeekPlan> {
  const keepPast = w.days.map((x) => ({ ...x, items: x.date < todayKey() ? x.items : [] }));
  return replan(p, { ...w, days: keepPast }, d, 'Woche neu geplant.');
}

/** Rückgängig für Wochen-Änderungen. */
export async function undoWeekChange(p: Profile, c: ChangeLogEntry, d: CoachDB = db): Promise<boolean> {
  if (c.undone || c.id === undefined) return false;
  if (c.kind === 'availability') {
    await setMeta(learnedKey(p.id), c.prevData ?? null, d);
  } else if (c.kind === 'deload' && typeof c.prevData === 'string') {
    const w = await d.weeks.get(`${p.id}:${c.prevData}`);
    if (!w) return false;
    const was = w.deload;
    await setMeta(deloadOverrideKey(p.id, w.weekStart), !was, d);
    await replan(p, { ...w, deload: !was }, d);
  } else {
    return false;
  }
  await d.changes.update(c.id, { undone: true });
  return true;
}

export async function weekChanges(pid: string, d: CoachDB = db): Promise<ChangeLogEntry[]> {
  const all = await d.changes.where('profileId').equals(pid).filter((c) => c.kind === 'availability' || c.kind === 'deload').toArray();
  return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
}

export async function isDeloadToday(p: Profile, d: CoachDB = db): Promise<boolean> {
  const w = await d.weeks.get(`${p.id}:${mondayOf(todayKey())}`);
  return !!w?.deload;
}

/** Nach Profiländerung (Trainingstage/Dauer): künftige Tage der laufenden Woche übernehmen und neu verteilen. */
export async function applyProfileAvailability(p: Profile, d: CoachDB = db): Promise<void> {
  const w = await d.weeks.get(`${p.id}:${mondayOf(todayKey())}`);
  if (!w) return;
  const learned = await getMeta<number[] | null>(learnedKey(p.id), null, d);
  // Profiländerung schlägt Gelerntes
  if (learned) await setMeta(learnedKey(p.id), null, d);
  const avail = defaultAvailability(p, null);
  const today = todayKey();
  const days = w.days.map((x, i) => (x.date >= today ? { ...x, availableMin: avail[i] ?? 0, items: x.items.filter((it) => !it.userEdited) } : x));
  await replan(p, { ...w, days }, d, 'Profil geändert – Woche an deine neuen Trainingstage angepasst.');
}
