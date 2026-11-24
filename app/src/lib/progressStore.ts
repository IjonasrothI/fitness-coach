// Fortschritt & Langzeit-Personalisierung (M6): Daten sammeln, Blockwechsel, Rückgängig.
import { checkinHistory } from './checkinStore';
import { db, getMeta, setMeta, type CoachDB } from './db';
import { criticalSpeed, currentFtp, INTERVAL_FORMATS, latestTest, paceStr } from './endurance';
import { listEndurance, listTests } from './enduranceStore';
import { addDays, mondayOf } from './planner';
import {
  adherence, efficiencySeries, endurancePlateau, mainSport, MAX_VOLUME_BOOST, patternSeries, recoveryIssue,
  strengthPlateau, streakWeeks, testSeries, trend, weeklyStats, type Point, type PlateauResult, type WeekStat
} from './progress';
import { todayKey } from './readiness';
import type { ChangeLogEntry, PatternId, PatternState, Profile, Sport } from './types';

const volumeKey = (pid: string) => `volumeBoost:${pid}`;
const formatKey = (pid: string) => `intervalFormat:${pid}`;
const formatAtKey = (pid: string) => `intervalFormatAt:${pid}`;
const reviewKey = (pid: string) => `blockReview:${pid}`;

export const getVolumeBoost = (pid: string, d: CoachDB = db) => getMeta<number>(volumeKey(pid), 0, d);
export const getIntervalFormat = (pid: string, d: CoachDB = db) => getMeta<number>(formatKey(pid), 0, d);

export interface ProgressData {
  weeks: WeekStat[];
  adherence: number | null;
  streak: number;
  patterns: Partial<Record<PatternId, Point[]>>;
  states: PatternState[];
  strength: PlateauResult & { up: PatternId[]; flat: PatternId[] };
  sport: Sport | null;
  efficiency: Point[];
  tests: { cs: Point[]; ftp: Point[] };
  endurance: PlateauResult;
  recovery: string | null;
  restingHr: Point[];
  weight: Point[];
  learned: { label: string; value: string; rule: string }[];
  volumeBoost: number;
  intervalFormat: number;
}

/** Sammelt alles für die Fortschrittsansicht und die Blockauswertung. */
export async function loadProgress(p: Profile, d: CoachDB = db, now = new Date()): Promise<ProgressData> {
  const today = todayKey(now);
  const thisWeek = mondayOf(today);
  const weekStarts = Array.from({ length: 12 }, (_, i) => addDays(thisWeek, -7 * (11 - i)));
  const [strengthAll, endurance, tests, plans, checkins, weightsRaw, states, rirOffset, volumeBoost, intervalFormat, lastCal, learnedAvail] = await Promise.all([
    d.sessions.where('profileId').equals(p.id).filter((s) => s.status === 'done').toArray(),
    listEndurance(p.id, d),
    listTests(p.id, d),
    d.weeks.where('profileId').equals(p.id).toArray(),
    checkinHistory(p.id, 120, d),
    d.weights.where('profileId').equals(p.id).toArray(),
    d.patternStates.where('profileId').equals(p.id).toArray(),
    getMeta<number>(`rirOffset:${p.id}`, 0, d),
    getVolumeBoost(p.id, d),
    getIntervalFormat(p.id, d),
    getMeta<string | null>(`lastCalibrationAt:${p.id}`, null, d),
    getMeta<number[] | null>(`learnedAvail:${p.id}`, null, d)
  ]);
  const weeks = weeklyStats(weekStarts, plans, strengthAll, endurance, rirOffset, today);
  // Adhärenz der letzten 6 abgeschlossenen Wochen + laufende
  const adh = adherence(weeks.slice(-7));
  const patterns = patternSeries(strengthAll, p, rirOffset);
  const sport = mainSport(endurance);
  const eff = sport ? efficiencySeries(endurance, sport) : [];
  const cs = testSeries(tests, 'cs');
  const ftp = testSeries(tests, 'ftp20');

  const learned: ProgressData['learned'] = [];
  if (lastCal) {
    learned.push({
      label: 'Deine Reserve-Einschätzung',
      value: Math.abs(rirOffset) < 0.5 ? 'treffsicher' : rirOffset > 0 ? `du unterschätzt die Reserve um ~${Math.round(rirOffset * 10) / 10} Wdh. – wird korrigiert` : `du überschätzt die Reserve um ~${Math.round(-rirOffset * 10) / 10} Wdh. – wird korrigiert`,
      rule: 'K9'
    });
  }
  if (p.endurance.maxHrMeasured) learned.push({ label: 'Maximalpuls (gemessen)', value: `${p.endurance.maxHrMeasured} /min`, rule: 'E3' });
  const csT = latestTest(tests, 'cs');
  const csV = csT ? criticalSpeed(csT) : null;
  if (csV) learned.push({ label: 'Kritische Geschwindigkeit', value: paceStr(1000 / csV.cs), rule: 'E4' });
  const f = currentFtp(tests);
  if (f) learned.push({ label: 'FTP', value: `${f} W`, rule: 'E7' });
  if (learnedAvail) {
    const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    learned.push({ label: 'Gelernte Standardwoche', value: learnedAvail.map((m, i) => (m ? `${WD[i]} ${m}` : '')).filter(Boolean).join(' · ') || 'keine festen Tage', rule: 'F21' });
  }
  const rhr = checkins.filter((c) => c.restingHr).map((c) => ({ date: c.date, value: c.restingHr! }));
  const rhrTrend = trend(rhr, 28, now, { minNoise: 1 });
  if (rhrTrend.n >= 4 && rhrTrend.to) learned.push({ label: 'Dein Ruhepuls-Normalwert', value: `${Math.round(rhrTrend.to)} /min`, rule: 'F10' });
  if (volumeBoost) learned.push({ label: 'Kraftvolumen', value: `+${volumeBoost} Sätze je Muskel/Woche (Plateau)`, rule: 'K18' });
  learned.push({ label: 'Intervallformat', value: INTERVAL_FORMATS[intervalFormat % INTERVAL_FORMATS.length]!.name, rule: 'F24' });

  return {
    weeks, adherence: adh, streak: streakWeeks(weeks), patterns, states,
    strength: strengthPlateau(patterns, adh, now),
    sport, efficiency: eff, tests: { cs, ftp },
    endurance: endurancePlateau(eff, sport === 'run' ? cs : ftp, adh, now),
    recovery: recoveryIssue(checkins, now),
    restingHr: rhr,
    weight: weightsRaw.map((w) => ({ date: w.date, value: w.kg })).sort((a, b) => a.date.localeCompare(b.date)),
    learned, volumeBoost, intervalFormat
  };
}

async function log(d: CoachDB, e: Omit<ChangeLogEntry, 'at'>) {
  await d.changes.add({ ...e, at: new Date().toISOString() });
}

/**
 * Blockwechsel (F24, synchron zum Deload): Plateau prüfen und höchstens eine Variable je Bereich ändern.
 * Erst Erholung prüfen (F17) – bei schlechtem Schlaf/hohem Stress keine Planänderung.
 */
export async function blockReview(p: Profile, weekStart: string, d: CoachDB = db, now = new Date()): Promise<string[]> {
  if ((await getMeta<string | null>(reviewKey(p.id), null, d)) === weekStart) return [];
  await setMeta(reviewKey(p.id), weekStart, d);
  const data = await loadProgress(p, d, now);
  const notes: string[] = [];
  if (data.recovery && (data.strength.plateau || data.endurance.plateau)) {
    notes.push(`Kein Fortschritt, aber zuerst die Erholung: ${data.recovery} Plan bleibt unverändert (F17).`);
    return notes;
  }
  if (data.strength.plateau && data.volumeBoost < MAX_VOLUME_BOOST) {
    const next = data.volumeBoost + 2;
    await setMeta(volumeKey(p.id), next, d);
    await log(d, {
      profileId: p.id, ruleId: 'K18', kind: 'volume', prevData: data.volumeBoost,
      what: `Neuer Block: Kraftvolumen +2 Sätze je Muskel/Woche`,
      why: `${data.strength.reason} Du hast deinen nächsten Reiz noch nicht gefunden – mehr Volumen ist der nächste Schritt.`
    });
    notes.push('Kraftvolumen erhöht (Plateau).');
  }
  const formatAt = await getMeta<string | null>(formatAtKey(p.id), null, d);
  const stale = formatAt ? addDays(formatAt, 84) <= weekStart : false;
  if (data.endurance.plateau || stale) {
    const next = (data.intervalFormat + 1) % INTERVAL_FORMATS.length;
    await setMeta(formatKey(p.id), next, d);
    await setMeta(formatAtKey(p.id), weekStart, d);
    await log(d, {
      profileId: p.id, ruleId: data.endurance.plateau ? 'F17' : 'F24', kind: 'intervalFormat', prevData: data.intervalFormat,
      what: `Neuer Block: Intervalle ${INTERVAL_FORMATS[next]!.name}`,
      why: data.endurance.plateau
        ? `${data.endurance.reason} Neuer Reiz über ein anderes Intervallformat – nur diese eine Änderung.`
        : 'Seit 12 Wochen dasselbe Intervallformat – Abwechslung zum neuen Block.'
    });
    notes.push('Intervallformat gewechselt.');
  } else if (!formatAt) {
    await setMeta(formatAtKey(p.id), weekStart, d);
  }
  return notes;
}

/** Rückgängig für Block-Änderungen. */
export async function undoProgressChange(p: Profile, c: ChangeLogEntry, d: CoachDB = db): Promise<boolean> {
  if (c.undone || c.id === undefined || typeof c.prevData !== 'number') return false;
  if (c.kind === 'volume') await setMeta(volumeKey(p.id), c.prevData, d);
  else if (c.kind === 'intervalFormat') await setMeta(formatKey(p.id), c.prevData, d);
  else return false;
  await d.changes.update(c.id, { undone: true });
  return true;
}
