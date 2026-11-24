// Ausdauer-Engine (Laufen, Rennrad draußen, Rolle). Reine Funktionen – testbar.
// Regel-IDs verweisen auf reports/Evidenzbasis Fitness Coach App.md
import { intenseAllowed, maxHr } from './derive';
import { LEG_REGIONS, type Caps } from './readiness';
import type {
  EnduranceSession, EnduranceTest, EnduranceType, Profile, Sport, StrengthSession, TestKind
} from './types';

const DAY = 86400000;

export const SPORT_LABELS: Record<Sport, string> = {
  run: 'Laufen', bikeOutdoor: 'Rennrad draußen', bikeIndoor: 'Rolle indoor'
};
export const TYPE_LABELS: Record<EnduranceType, string> = {
  easy: 'Locker', long: 'Lang', tempo: 'Tempo / Schwelle', intervals: 'Intervalle', test: 'Test', recovery: 'Regeneration'
};
export const TEST_LABELS: Record<TestKind, string> = {
  cs: 'Critical-Speed-Test (Laufen)', talkRun: 'Talktest Laufen', ftp20: '20-min-FTP-Test (Rolle)', talkBike: 'Talktest Rad'
};
/** Retest-Intervall in Tagen (6–8 Wochen) */
export const RETEST_DAYS = 49;

/** Intervallformate – Wechsel bei Plateau oder neuem Block (F17, F24, E22). */
export const INTERVAL_FORMATS: { name: string; long: [string, string]; short: [string, string] }[] = [
  { name: '4 × 4 min', long: ['4 × 4 min', '3 min locker'], short: ['5 × 3 min', '2 min locker'] },
  { name: '6 × 3 min', long: ['6 × 3 min', '2 min locker'], short: ['4 × 3 min', '2 min locker'] },
  { name: '30/15 s', long: ['3 Serien × 13 × (30 s hart / 15 s locker)', '3 min locker zwischen den Serien'], short: ['2 Serien × 13 × (30 s hart / 15 s locker)', '3 min locker zwischen den Serien'] }
];

export function intervalSet(minutes: number, format = 0): { reps: string; rec: string } {
  const f = INTERVAL_FORMATS[format % INTERVAL_FORMATS.length]!;
  const [reps, rec] = minutes >= 45 ? f.long : f.short;
  return { reps, rec };
}

// ---------- Formatierung ----------

export function paceStr(secPerKm: number): string {
  const s = Math.round(secPerKm);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')} /km`;
}
export function parsePace(text: string): number | null {
  const m = text.trim().match(/^(\d{1,2})[:.,](\d{1,2})$/);
  if (!m) return null;
  const sec = Number(m[1]) * 60 + Number(m[2]);
  return sec >= 150 && sec <= 900 ? sec : null;
}
const speedToPace = (mps: number) => 1000 / mps;
const paceToSpeed = (secPerKm: number) => 1000 / secPerKm;

export function durationStr(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

// ---------- Feldtests ----------

/** Critical Speed aus zwei Maximalläufen (E4). */
export function criticalSpeed(t: Pick<EnduranceTest, 't1Sec' | 'd1M' | 't2Sec' | 'd2M'>):
  { cs: number; dPrime: number } | null {
  const { t1Sec, d1M, t2Sec, d2M } = t;
  if (!t1Sec || !d1M || !t2Sec || !d2M || t2Sec <= t1Sec || d2M <= d1M) return null;
  const cs = (d2M - d1M) / (t2Sec - t1Sec);
  const dPrime = d1M - cs * t1Sec;
  if (cs < 1.5 || cs > 7) return null;
  return { cs, dPrime: Math.max(0, dPrime) };
}

/** Grobe Prognose für Strecken im Gültigkeitsbereich des CS-Modells (bis ~5 km). */
export function predictTime(cs: number, dPrime: number, meters: number): number {
  return (meters - dPrime) / cs;
}

export function latestTest(tests: EnduranceTest[], kind: TestKind): EnduranceTest | undefined {
  return tests.filter((t) => t.kind === kind).sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function testDue(tests: EnduranceTest[], kind: TestKind, now = new Date()): boolean {
  const t = latestTest(tests, kind);
  return !t || now.getTime() - new Date(t.date).getTime() > RETEST_DAYS * DAY;
}

/** FTP = 95 % der 20-min-Leistung (E7). */
export const ftpFrom20 = (power20: number) => Math.round(power20 * 0.95);

// ---------- Zonen ----------

export interface Zones {
  /** Obergrenze locker (Talktest/VT1) */
  easy: { paceSec?: number; hr?: number; power?: number; source: string };
  tempo: { paceSec?: [number, number]; hr?: [number, number]; power?: [number, number]; rpe: string };
  intervals: { paceSec?: [number, number]; hr?: number; power?: [number, number]; rpe: string };
}

export function hrEasyMax(p: Profile, tests: EnduranceTest[], sport: Sport): { hr: number; source: string } {
  const talkRun = latestTest(tests, 'talkRun');
  const talkBike = latestTest(tests, 'talkBike');
  if (sport !== 'run' && talkBike?.hr) return { hr: talkBike.hr, source: 'Talktest Rad' };
  if (sport === 'run' && talkRun?.hr) return { hr: talkRun.hr, source: 'Talktest Laufen' };
  // Radpuls liegt meist etwas unter Laufpuls (D)
  if (sport !== 'run' && talkRun?.hr) return { hr: talkRun.hr - 7, source: 'Talktest Laufen − 7 (Schätzung)' };
  const hm = maxHr(p).value;
  const rest = p.endurance.restingHr;
  if (rest) return { hr: Math.round(rest + 0.7 * (hm - rest)), source: '70 % Herzfrequenzreserve (Schätzung)' };
  return { hr: Math.round(0.75 * hm), source: '75 % HFmax (Schätzung)' };
}

export function zones(p: Profile, tests: EnduranceTest[], sport: Sport): Zones {
  const hm = maxHr(p).value;
  const easyHr = hrEasyMax(p, tests, sport);
  if (sport === 'run') {
    const csT = latestTest(tests, 'cs');
    const cs = csT ? criticalSpeed(csT) : null;
    const talk = latestTest(tests, 'talkRun');
    const easyPace = talk?.paceSec ?? (cs ? speedToPace(cs.cs * 0.8) : undefined);
    return {
      easy: {
        paceSec: easyPace, hr: easyHr.hr,
        source: talk?.paceSec ? 'Talktest' : cs ? 'Critical Speed (80 %, Schätzung)' : easyHr.source
      },
      // E6: Schwelle bei oder leicht unter CS
      tempo: {
        paceSec: cs ? [speedToPace(cs.cs * 0.97), speedToPace(cs.cs * 0.9)] : undefined,
        hr: [Math.round(hm * 0.85), Math.round(hm * 0.92)], rpe: '5–6 (kurze Sätze möglich)'
      },
      intervals: {
        paceSec: cs ? [speedToPace(cs.cs * 1.08), speedToPace(cs.cs * 1.03)] : undefined,
        hr: Math.round(hm * 0.9), rpe: '7–8 (nur einzelne Wörter)'
      }
    };
  }
  if (sport === 'bikeIndoor' && p.endurance.bikeIndoorPower) {
    const f = latestTest(tests, 'ftp20');
    const ftp = f?.power ? ftpFrom20(f.power) : undefined;
    const talk = latestTest(tests, 'talkBike');
    const easyPower = talk?.power ?? (ftp ? Math.round(ftp * 0.75) : undefined);
    return {
      easy: { power: easyPower, hr: easyHr.hr, source: talk?.power ? 'Talktest' : ftp ? '75 % FTP' : easyHr.source },
      tempo: { power: ftp ? [Math.round(ftp * 0.85), Math.round(ftp * 0.95)] : undefined, hr: [Math.round(hm * 0.8), Math.round(hm * 0.88)], rpe: '5–6' },
      intervals: { power: ftp ? [Math.round(ftp * 1.05), Math.round(ftp * 1.2)] : undefined, hr: Math.round(hm * 0.88), rpe: '7–8' }
    };
  }
  return {
    easy: { hr: easyHr.hr, source: easyHr.source },
    tempo: { hr: [Math.round(hm * 0.8), Math.round(hm * 0.88)], rpe: '5–6' },
    intervals: { hr: Math.round(hm * 0.88), rpe: '7–8' }
  };
}

export function currentFtp(tests: EnduranceTest[]): number | undefined {
  const f = latestTest(tests, 'ftp20');
  return f?.power ? ftpFrom20(f.power) : undefined;
}

// ---------- Belastung & Verteilung ----------

/** Session-RPE × Minuten (E11) – gemeinsame Währung. */
export const load = (sRpe: number, minutes: number) => sRpe * minutes;

export function strengthMinutes(s: StrengthSession): number {
  if (!s.finishedAt) return s.plannedMinutes;
  return Math.max(5, Math.round((new Date(s.finishedAt).getTime() - new Date(s.startedAt).getTime()) / 60000));
}

/** War eine „lockere" Einheit zu hart? (E1, E5) */
export function tooHardForEasy(s: EnduranceSession, p: Profile, tests: EnduranceTest[]): string | null {
  if (!['easy', 'long', 'recovery'].includes(s.type)) return null;
  const z = zones(p, tests, s.sport);
  if (s.avgHr && z.easy.hr && s.avgHr > z.easy.hr + 3) {
    return `Ø-Puls ${s.avgHr} liegt über deiner Locker-Grenze (${z.easy.hr}).`;
  }
  if (s.sport === 'run' && s.distanceKm && z.easy.paceSec) {
    const pace = (s.durationMin * 60) / s.distanceKm;
    if (pace < z.easy.paceSec * 0.97) return `Tempo ${paceStr(pace)} ist schneller als deine Locker-Grenze (${paceStr(z.easy.paceSec)}).`;
  }
  if (s.sport === 'bikeIndoor' && s.avgPower && z.easy.power && s.avgPower > z.easy.power * 1.05) {
    return `Ø ${s.avgPower} W liegt über deiner Locker-Grenze (${z.easy.power} W).`;
  }
  if (s.sRpe >= 5) return `Anstrengung ${s.sRpe}/10 ist für eine lockere Einheit zu hoch.`;
  return null;
}

/** Geschätzte Minuten je Intensitätszone (Z1 locker, Z2 Schwelle, Z3 hoch). */
export function zoneMinutes(s: EnduranceSession, p: Profile, tests: EnduranceTest[]): [number, number, number] {
  const d = s.durationMin;
  switch (s.type) {
    case 'tempo': return [d * 0.4, d * 0.6, 0];
    case 'intervals': return [d * 0.65, d * 0.05, d * 0.3];
    case 'test': return [d * 0.6, d * 0.05, d * 0.35];
    default:
      return tooHardForEasy(s, p, tests) ? [d * 0.3, d * 0.7, 0] : [d, 0, 0];
  }
}

export function distribution(sessions: EnduranceSession[], p: Profile, tests: EnduranceTest[]):
  { minutes: [number, number, number]; share: [number, number, number] } {
  const m: [number, number, number] = [0, 0, 0];
  for (const s of sessions) {
    const z = zoneMinutes(s, p, tests);
    m[0] += z[0]; m[1] += z[1]; m[2] += z[2];
  }
  const total = m[0] + m[1] + m[2] || 1;
  return { minutes: m, share: [m[0] / total, m[1] / total, m[2] / total] };
}

/** WHO-Minuten: moderat + 2 × intensiv (E20). */
export function whoMinutes(sessions: EnduranceSession[], p: Profile, tests: EnduranceTest[]): number {
  return Math.round(sessions.reduce((t, s) => {
    const z = zoneMinutes(s, p, tests);
    return t + z[0] + 2 * (z[1] + z[2]);
  }, 0));
}

export function within(sessions: EnduranceSession[], days: number, now = new Date()): EnduranceSession[] {
  const since = now.getTime() - days * DAY;
  return sessions.filter((s) => new Date(s.date).getTime() >= since && new Date(s.date).getTime() <= now.getTime());
}

/** Monotonie-Hinweis (E13): Ø/SD der Tageslast > 2 bei steigender Last. */
export function monotonyHint(daily: number[], prevWeekLoad: number): string | null {
  if (daily.length !== 7) return null;
  const sum = daily.reduce((a, b) => a + b, 0);
  const mean = sum / 7;
  const sd = Math.sqrt(daily.reduce((a, b) => a + (b - mean) ** 2, 0) / 7);
  if (sd === 0 || mean === 0) return null;
  if (mean / sd > 2 && sum > prevWeekLoad * 1.1) {
    return 'Sehr gleichförmige, steigende Belastung. Plane echte Ruhetage oder deutlich leichtere Tage ein.';
  }
  return null;
}

// ---------- Einzellauf-Regel (E14, E16) ----------

export function longestRun(runs: EnduranceSession[], p: Profile, now = new Date()): { km: number; seeded: boolean } {
  const recent = runs.filter((r) => r.sport === 'run' && r.distanceKm && now.getTime() - new Date(r.date).getTime() <= 30 * DAY && new Date(r.date) <= now);
  const logged = Math.max(0, ...recent.map((r) => r.distanceKm ?? 0));
  // Startwert aus dem Profil gilt nur in den ersten 30 Tagen
  const seedValid = now.getTime() - new Date(p.createdAt).getTime() <= 30 * DAY;
  const seed = seedValid ? p.experience.longestRunLast30dKm : 0;
  return seed > logged ? { km: seed, seeded: true } : { km: logged, seeded: false };
}

export type LongRunLevel = 'ok' | 'warn' | 'confirm' | 'block';

export function checkRunDistance(km: number, reference: number): { level: LongRunLevel; pct: number; text: string } {
  if (reference <= 0) {
    return km > 8
      ? { level: 'warn', pct: 0, text: 'Kein Lauf in den letzten 30 Tagen – nach einer Pause kurz und locker wieder einsteigen.' }
      : { level: 'ok', pct: 0, text: '' };
  }
  const pct = (km / reference - 1) * 100;
  if (pct > 100) return { level: 'block', pct, text: `Mehr als doppelt so lang wie dein längster Lauf der letzten 30 Tage (${reference} km). Deutlich erhöhtes Verletzungsrisiko.` };
  if (pct > 30) return { level: 'confirm', pct, text: `${Math.round(pct)} % länger als dein längster Lauf der letzten 30 Tage (${reference} km). Das Verletzungsrisiko steigt deutlich (Frandsen 2025).` };
  if (pct > 10) return { level: 'warn', pct, text: `${Math.round(pct)} % länger als dein längster Lauf der letzten 30 Tage (${reference} km). Ab +10 % steigt das Verletzungsrisiko.` };
  return { level: 'ok', pct, text: '' };
}

/** Weicher Hinweis bei starkem 2-Wochen-Zuwachs (E15). */
export function weeklyIncreaseHint(runs: EnduranceSession[], now = new Date()): string | null {
  const km = (from: number, to: number) => runs
    .filter((r) => r.sport === 'run' && new Date(r.date).getTime() > now.getTime() - from * DAY && new Date(r.date).getTime() <= now.getTime() - to * DAY)
    .reduce((t, r) => t + (r.distanceKm ?? 0), 0);
  const last2 = km(14, 0);
  const prev2 = km(28, 14);
  if (prev2 >= 10 && last2 > prev2 * 1.3) {
    return `Laufumfang der letzten 2 Wochen ${Math.round(last2)} km statt ${Math.round(prev2)} km (+${Math.round((last2 / prev2 - 1) * 100)} %). Kein Verbot, aber achte auf Warnzeichen.`;
  }
  return null;
}

// ---------- Fortschritt ----------

/** Aerobe Effizienz: Lauf m/min pro Schlag, Rolle W pro Schlag – nur lockere Einheiten. */
export function efficiency(s: EnduranceSession): number | null {
  if (!['easy', 'long', 'recovery'].includes(s.type) || !s.avgHr) return null;
  // bei Drift-Angabe die erste Hälfte nehmen (Wärme/Ermüdung verzerrt sonst)
  const hr = s.hrSecondHalf ? 2 * s.avgHr - s.hrSecondHalf : s.avgHr;
  if (hr < 60) return null;
  if (s.sport === 'run' && s.distanceKm) return (s.distanceKm * 1000) / s.durationMin / hr;
  if (s.sport === 'bikeIndoor' && s.avgPower) return s.avgPower / hr;
  return null;
}

/** Trend der Effizienz: letzte 4 Wochen vs. 4 Wochen davor, in %. */
export function efficiencyTrend(sessions: EnduranceSession[], sport: Sport, now = new Date()):
  { current: number; previous: number; pct: number; n: number } | null {
  const vals = (from: number, to: number) => sessions
    .filter((s) => s.sport === sport)
    .filter((s) => { const t = new Date(s.date).getTime(); return t > now.getTime() - from * DAY && t <= now.getTime() - to * DAY; })
    .map(efficiency).filter((v): v is number => v !== null);
  const cur = vals(28, 0);
  const prev = vals(56, 28);
  if (cur.length < 2 || prev.length < 2) return null;
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  const c = avg(cur);
  const pr = avg(prev);
  return { current: c, previous: pr, pct: (c / pr - 1) * 100, n: cur.length };
}

export function driftPct(s: EnduranceSession): number | null {
  if (!s.avgHr || !s.hrSecondHalf) return null;
  const first = 2 * s.avgHr - s.hrSecondHalf;
  return ((s.hrSecondHalf - first) / first) * 100;
}

/** Neuer beobachteter Maximalpuls (E3)? */
export function newMaxHr(p: Profile, s: EnduranceSession): number | null {
  if (!s.maxHr || s.maxHr < 120 || s.maxHr > 230) return null;
  const current = p.endurance.maxHrMeasured ?? 0;
  return s.maxHr > current ? s.maxHr : null;
}

// ---------- Vorschlag für die nächste Einheit ----------

export interface Suggestion {
  sport: Sport;
  type: EnduranceType;
  minutes: number;
  title: string;
  structure: string[];
  target: string;
  why: string[];
  maxKm?: number;
}

const HARD: EnduranceType[] = ['tempo', 'intervals', 'test'];
const LEG_PATTERNS = ['squat', 'hinge', 'hamstring'];

export function suggest(
  p: Profile, sport: Sport, minutes: number, sessions: EnduranceSession[], strength: StrengthSession[],
  tests: EnduranceTest[], now = new Date(), caps?: Caps, intervalFormat = 0
): Suggestion {
  const why: string[] = [];
  if (caps?.noTraining) {
    return {
      sport, type: 'recovery', minutes: 0, title: 'Ruhetag',
      structure: ['Heute keine Trainingseinheit.', 'Leichtes Gehen ist in Ordnung, wenn du dich danach fühlst.'],
      target: '', why: ['Laut Check-in heute kein Training (Krankheit oder Warnzeichen).']
    };
  }
  if (caps?.recoveryOnly) {
    const sp: Sport = sport === 'run' ? 'bikeOutdoor' : sport;
    const m = Math.min(minutes, 30);
    return {
      sport: sp, type: 'recovery', minutes: m, title: 'Lockere Erholung',
      structure: [`${m} min sehr locker – lieber zu leicht als zu schwer`, 'Alternativ: Spaziergang oder Mobilität'],
      target: targetText(zones(p, tests, sp), 'easy', sp),
      why: ['Tagesform rot: heute nur Erholung (F4).']
    };
  }
  if (caps?.painRegions.some((r) => LEG_REGIONS.includes(r)) && sport === 'run') {
    why.push('Heute Schmerz über 5/10 im Bein – Radfahren entlastet (E25).');
    return easy('bikeOutdoor', minutes, targetText(zones(p, tests, 'bikeOutdoor'), 'easy', 'bikeOutdoor'), why);
  }
  const week = within(sessions, 7, now);
  const z = zones(p, tests, sport);
  const target = (t: 'easy' | 'tempo' | 'intervals') => targetText(z, t, sport);
  const lr = longestRun(sessions, p, now);

  // Schmerzen beim Laufen in den letzten 7 Tagen → Rad statt Laufen (E25)
  const runPain = week.some((s) => s.sport === 'run' && s.pain?.some((x) => x.score > 5));
  if (sport === 'run' && runPain) {
    why.push('Du hattest diese Woche beim Laufen Schmerzen über 5/10. Lockeres Radfahren hält die Ausdauer, ohne die Region zu belasten (E25).');
    return easy('bikeOutdoor', minutes, targetText(zones(p, tests, 'bikeOutdoor'), 'easy', 'bikeOutdoor'), why);
  }

  let allowHard = true;
  if (caps?.noIntensity) {
    allowHard = false;
    why.push('Tagesform: heute keine harten Einheiten (Schlaf, Ruhepuls oder Befinden).');
  }
  if (allowHard && !intenseAllowed(p)) {
    allowHard = false;
    why.push('Intensive Einheiten sind bis zur ärztlichen Freigabe gesperrt (Gesundheitscheck).');
  }
  const lastHard = week.filter((s) => HARD.includes(s.type)).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (allowHard && lastHard && now.getTime() - new Date(lastHard.date).getTime() < 48 * 3600000) {
    allowHard = false;
    why.push('Deine letzte harte Einheit ist weniger als 48 h her.');
  }
  const legDay = strength.some((s) => s.status === 'done' && s.finishedAt &&
    now.getTime() - new Date(s.finishedAt).getTime() < 24 * 3600000 &&
    s.sets.some((x) => LEG_PATTERNS.includes(x.pattern)));
  if (allowHard && legDay && sport === 'run') {
    allowHard = false;
    why.push('Hartes Beintraining vor weniger als 24 h – heute keine Schlüsseleinheit (E18).');
  }
  const dist = distribution(within(sessions, 14, now), p, tests);
  const hardThisWeek = week.filter((s) => s.type === 'intervals' || s.type === 'test').length;

  if (allowHard && minutes >= 30 && hardThisWeek === 0 && dist.share[2] < 0.1) {
    const { reps, rec } = intervalSet(minutes, intervalFormat);
    why.push('Diese Woche noch keine hochintensive Einheit. 1 × pro Woche verbessert die VO2max am effektivsten (E22).');
    return {
      sport, type: 'intervals', minutes, title: `Intervalle ${reps}`,
      structure: ['10 min locker einlaufen/-fahren, 2–3 kurze Steigerungen', `${reps} hart, dazwischen ${rec}`, 'Rest locker ausklingen'],
      target: target('intervals'), why
    };
  }

  const longThisWeek = week.some((s) => s.sport === sport && s.type === 'long');
  const longMin = sport === 'run' ? 60 : 90;
  if (!longThisWeek && minutes >= longMin && sport !== 'bikeIndoor') {
    const s: Suggestion = {
      sport, type: 'long', minutes, title: sport === 'run' ? 'Langer lockerer Lauf' : 'Lange Grundlagenfahrt',
      structure: ['Gleichmäßig locker – du kannst ganze Sätze sprechen', 'Optional: Puls der zweiten Hälfte notieren (Drift)'],
      target: target('easy'), why: [...why, 'Diese Woche noch keine lange Einheit.']
    };
    if (sport === 'run') {
      const cap = lr.km > 0 ? Math.round(lr.km * 1.1 * 10) / 10 : 5;
      s.maxKm = cap;
      s.why.push(`Maximal ${cap} km: höchstens 10 % mehr als dein längster Lauf der letzten 30 Tage (${lr.km} km) (E14).`);
    }
    return s;
  }

  const tempoThisWeek = week.some((s) => s.type === 'tempo');
  if (allowHard && minutes >= 35 && !tempoThisWeek && dist.share[1] < 0.15) {
    why.push('Ein Tempo-/Schwellenreiz pro Woche gehört zur pyramidalen Verteilung (E1).');
    return {
      sport, type: 'tempo', minutes, title: minutes >= 50 ? 'Tempo 3 × 10 min' : 'Tempo 2 × 10 min',
      structure: ['10 min locker', `${minutes >= 50 ? '3' : '2'} × 10 min zügig, dazwischen 3 min locker`, 'Rest locker'],
      target: target('tempo'), why
    };
  }

  why.push('Der Großteil des Trainings sollte locker sein – das ist die Basis für alles andere (E1).');
  const e = easy(sport, minutes, target('easy'), why);
  if (sport === 'run' && lr.km > 0) e.maxKm = Math.round(lr.km * 1.1 * 10) / 10;
  return e;
}

function easy(sport: Sport, minutes: number, target: string, why: string[]): Suggestion {
  return {
    sport, type: 'easy', minutes, title: sport === 'run' ? 'Lockerer Lauf' : 'Lockere Fahrt',
    structure: ['Gleichmäßig locker – Talktest: ganze Sätze sprechen'], target, why
  };
}

export function targetText(z: Zones, t: 'easy' | 'tempo' | 'intervals', sport: Sport): string {
  const parts: string[] = [];
  if (t === 'easy') {
    if (z.easy.paceSec) parts.push(`langsamer als ${paceStr(z.easy.paceSec)}`);
    if (z.easy.power) parts.push(`unter ${z.easy.power} W`);
    if (z.easy.hr) parts.push(`Puls unter ${z.easy.hr}`);
    parts.push('Anstrengung ≤ 3/10');
  } else if (t === 'tempo') {
    if (z.tempo.paceSec) parts.push(`${paceStr(z.tempo.paceSec[0]).replace(' /km', '')}–${paceStr(z.tempo.paceSec[1])}`);
    if (z.tempo.power) parts.push(`${z.tempo.power[0]}–${z.tempo.power[1]} W`);
    if (z.tempo.hr) parts.push(`Puls ${z.tempo.hr[0]}–${z.tempo.hr[1]}`);
    parts.push(`Anstrengung ${z.tempo.rpe}`);
  } else {
    if (z.intervals.paceSec) parts.push(`${paceStr(z.intervals.paceSec[0]).replace(' /km', '')}–${paceStr(z.intervals.paceSec[1])}`);
    if (z.intervals.power) parts.push(`${z.intervals.power[0]}–${z.intervals.power[1]} W`);
    if (z.intervals.hr) parts.push(`Puls steigt gegen Ende über ${z.intervals.hr}`);
    parts.push(`Anstrengung ${z.intervals.rpe}`);
    if (sport !== 'bikeIndoor') parts.push('Puls reagiert verzögert – in der ersten Minute nach Gefühl (E9)');
  }
  return parts.join(' · ');
}

/** Beschreibt eine im Wochenplan geplante Einheit, angepasst an die Tagesform. */
export function describePlanned(
  p: Profile, sport: Sport, type: EnduranceType, minutes: number, sessions: EnduranceSession[],
  tests: EnduranceTest[], caps?: Caps, deload = false, now = new Date(), intervalFormat = 0
): Suggestion {
  const why: string[] = [];
  if (caps?.noTraining || caps?.recoveryOnly || (caps?.painRegions.some((r) => LEG_REGIONS.includes(r)) && sport === 'run')) {
    return suggest(p, sport, minutes, sessions, [], tests, now, caps);
  }
  let t = type;
  if ((t === 'intervals' || t === 'tempo') && (caps?.noIntensity || !intenseAllowed(p))) {
    why.push(caps?.noIntensity ? 'Tagesform: heute locker statt hart – die harte Einheit fällt diese Woche weg.' : 'Intensive Einheiten sind bis zur ärztlichen Freigabe gesperrt.');
    t = 'easy';
  }
  const z = zones(p, tests, sport);
  const lr = longestRun(sessions, p, now);
  const cap = sport === 'run' ? (lr.km > 0 ? Math.round(lr.km * 1.1 * 10) / 10 : 5) : undefined;
  if (deload) why.push('Entlastungswoche: kürzer und locker, dazu 4–6 kurze Steigerungen (je 15–20 s) am Ende (F13).');
  if (t === 'intervals') {
    const { reps, rec } = intervalSet(minutes, intervalFormat);
    return {
      sport, type: t, minutes, title: `Intervalle ${reps}`,
      structure: ['10 min locker einlaufen/-fahren, 2–3 kurze Steigerungen', `${reps} hart, dazwischen ${rec}`, 'Rest locker ausklingen'],
      target: targetText(z, 'intervals', sport), why: [...why, 'Wochen-Schlüsseleinheit für die VO2max (E22).']
    };
  }
  if (t === 'tempo') {
    return {
      sport, type: t, minutes, title: minutes >= 50 ? 'Tempo 3 × 10 min' : 'Tempo 2 × 10 min',
      structure: ['10 min locker', `${minutes >= 50 ? '3' : '2'} × 10 min zügig, dazwischen 3 min locker`, 'Rest locker'],
      target: targetText(z, 'tempo', sport), why: [...why, 'Schwellenreiz der Woche (E1).']
    };
  }
  if (t === 'long') {
    return {
      sport, type: t, minutes, title: sport === 'run' ? 'Langer lockerer Lauf' : 'Lange Grundlagenfahrt',
      structure: ['Gleichmäßig locker – ganze Sätze sprechbar', 'Optional: Puls der zweiten Hälfte notieren (Drift)'],
      target: targetText(z, 'easy', sport), maxKm: cap,
      why: [...why, ...(cap ? [`Maximal ${cap} km (+10 % auf deinen längsten Lauf der letzten 30 Tage, E14).`] : [])]
    };
  }
  return {
    sport, type: t, minutes, title: sport === 'run' ? 'Lockerer Lauf' : 'Lockere Fahrt',
    structure: ['Gleichmäßig locker – Talktest: ganze Sätze sprechen'], target: targetText(z, 'easy', sport),
    maxKm: cap, why: [...why, 'Lockeres Training ist die Basis (E1).']
  };
}
