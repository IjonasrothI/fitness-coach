// Fortschritt (M6): geglättete Trends (F16, F20), Plateau-Erkennung (K18, F17), Wochenstatistik.
// Reine Funktionen – keine Datenbank.
import { criticalSpeed, efficiency, ftpFrom20 } from './endurance';
import { itemStatus } from './planner';
import { correctedRir, isHardSet, ladder, stepIndex, windowFor } from './strength';
import { todayKey } from './readiness';
import type {
  CheckIn, EnduranceSession, EnduranceTest, PatternId, Profile, Sport, StrengthSession, WeekPlan
} from './types';

const DAY = 86400000;
const t = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00` : d).getTime();

export interface Point { date: string; value: number }
export interface Smoothed extends Point { est: number; sd: number }
export type Trend = 'up' | 'down' | 'flat' | 'unclear';

/** Typischer Messfehler aus aufeinanderfolgenden Differenzen (Var(Δ)/2). */
export function noiseOf(values: number[], minNoise = 0): number {
  if (values.length < 3) return minNoise;
  const diffs = values.slice(1).map((v, i) => v - values[i]!);
  const mean = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const v = diffs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, diffs.length - 1);
  return Math.max(minNoise, Math.sqrt(v / 2));
}

/**
 * Lokales Niveau-Modell (einfacher Kalman-Filter, F20): Schätzung pro Messung,
 * Prozessrauschen wächst mit dem Abstand in Tagen.
 */
export function smooth(points: Point[], opts: { noise?: number; minNoise?: number } = {}): { series: Smoothed[]; noise: number } {
  const sorted = [...points].sort((a, b) => t(a.date) - t(b.date));
  if (!sorted.length) return { series: [], noise: opts.noise ?? 0 };
  const noise = opts.noise ?? noiseOf(sorted.map((p) => p.value), opts.minNoise ?? 1e-6);
  const r = Math.max(noise ** 2, 1e-12);
  const q = r / 60; // nach ~2 Monaten darf sich das Niveau um etwa einen Messfehler verschoben haben
  let est = sorted[0]!.value;
  let P = r;
  let last = t(sorted[0]!.date);
  const series: Smoothed[] = [];
  sorted.forEach((p, i) => {
    if (i > 0) {
      const dt = Math.max(0.5, (t(p.date) - last) / DAY);
      P += q * dt;
      const K = P / (P + r);
      est += K * (p.value - est);
      P = (1 - K) * P;
      last = t(p.date);
    }
    series.push({ ...p, est, sd: Math.sqrt(P) });
  });
  return { series, noise };
}

/**
 * Echte Veränderung erst ab 1,5 × typischem Messfehler des geglätteten Trends (F16).
 * Mindestens 4 Messungen, die mindestens die Hälfte des Zeitfensters abdecken.
 */
export function trend(points: Point[], days: number, now = new Date(), opts: { minNoise?: number } = {}):
  { trend: Trend; delta: number; noise: number; n: number; from?: number; to?: number } {
  const cut = now.getTime() - days * DAY;
  const upto = points.filter((p) => t(p.date) <= now.getTime()).sort((a, b) => t(a.date) - t(b.date));
  const inWin = upto.filter((p) => t(p.date) >= cut);
  const { series, noise } = smooth(upto, { minNoise: opts.minNoise });
  const base = { delta: 0, noise, n: inWin.length };
  if (inWin.length < 4) return { trend: 'unclear', ...base };
  const span = (t(inWin[inWin.length - 1]!.date) - t(inWin[0]!.date)) / DAY;
  if (span < days * 0.5) return { trend: 'unclear', ...base };
  const startIdx = series.findIndex((s) => t(s.date) >= cut);
  const from = series[Math.max(0, startIdx - 1)]!.est;
  const to = series[series.length - 1]!.est;
  const delta = to - from;
  const thr = 1.5 * noise;
  return { trend: delta > thr ? 'up' : delta < -thr ? 'down' : 'flat', delta, noise, n: inWin.length, from, to };
}

// ---------- Kraft ----------

/**
 * Leistungsniveau je Muster: Leiterstufe + Position im Wdh.-Fenster (Wdh. + Reserve im ersten Satz).
 * Ein Stufenaufstieg (Start wieder unten im Fenster) bleibt so etwa stetig.
 * Einheiten mit Tagesform-Deckel oder Entlastung zählen nicht (bewusst mehr Reserve).
 */
export function patternSeries(sessions: StrengthSession[], p: Profile, rirOffset: number): Partial<Record<PatternId, Point[]>> {
  const out: Partial<Record<PatternId, Point[]>> = {};
  const done = sessions.filter((s) => s.status === 'done' && s.kind === 'strength').sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  for (const s of done) {
    const date = todayKey(new Date(s.startedAt));
    const patterns = [...new Set(s.sets.map((x) => x.pattern))];
    for (const pat of patterns) {
      const planned = s.plan.find((x) => x.pattern === pat);
      if (planned && (planned.deload || (planned.minRir ?? 0) >= 2)) continue;
      const first = s.sets.find((x) => x.pattern === pat);
      if (!first) continue;
      const steps = ladder(pat, p, []);
      const step = { exerciseId: first.exerciseId, bandLevel: first.bandLevel };
      const i = stepIndex(steps, step);
      if (i < 0) continue;
      const [lo, hi] = windowFor(step);
      const eff = first.reps + correctedRir(first.rir, rirOffset);
      const frac = Math.min(1, Math.max(0, (eff - lo) / Math.max(1, hi - lo)));
      const list = (out[pat] ??= []);
      const value = Math.round((i + frac) * 100) / 100;
      if (list.length && list[list.length - 1]!.date === date) list[list.length - 1] = { date, value };
      else list.push({ date, value });
    }
  }
  return out;
}

export interface PlateauResult { plateau: boolean; reason: string; detail: string[] }

/**
 * K18 / F17 übertragen auf die ganze Kraft: Adhärenz ≥ 80 % und die Mehrheit der Muster
 * ohne echte Steigerung über 6 Wochen → Plateau.
 */
export function strengthPlateau(series: Partial<Record<PatternId, Point[]>>, adherence: number | null, now = new Date()): PlateauResult & { up: PatternId[]; flat: PatternId[] } {
  const up: PatternId[] = [];
  const flat: PatternId[] = [];
  for (const [pat, pts] of Object.entries(series) as [PatternId, Point[]][]) {
    const tr = trend(pts, 42, now, { minNoise: 0.05 });
    if (tr.trend === 'up') up.push(pat);
    else if (tr.trend === 'flat' || tr.trend === 'down') flat.push(pat);
  }
  const judged = up.length + flat.length;
  const base = { up, flat, detail: [] as string[] };
  if (judged < 3) return { ...base, plateau: false, reason: 'Noch zu wenige Einheiten für eine Aussage (mind. 4 je Übung über 3 Wochen).' };
  if (adherence !== null && adherence < 0.8) {
    return { ...base, plateau: false, reason: `Erst regelmäßig trainieren: ${Math.round(adherence * 100)} % der geplanten Einheiten erledigt (Ziel ≥ 80 %).` };
  }
  const plateau = flat.length / judged >= 0.6;
  return {
    ...base, plateau,
    reason: plateau
      ? `${flat.length} von ${judged} Übungsmustern ohne echte Steigerung in 6 Wochen.`
      : `${up.length} von ${judged} Übungsmustern steigen.`
  };
}

// ---------- Ausdauer ----------

export function efficiencySeries(sessions: EnduranceSession[], sport: Sport): Point[] {
  return sessions.filter((s) => s.sport === sport)
    .map((s) => ({ date: todayKey(new Date(s.date)), value: efficiency(s) }))
    .filter((x): x is Point => x.value !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Testwerte: Lauf = kritische Geschwindigkeit (m/s), Rad = FTP (W). Höher ist besser. */
export function testSeries(tests: EnduranceTest[], kind: 'cs' | 'ftp20'): Point[] {
  return tests.filter((x) => x.kind === kind).map((x) => {
    const v = kind === 'cs' ? criticalSpeed(x)?.cs : x.power ? ftpFrom20(x.power) : undefined;
    return { date: todayKey(new Date(x.date)), value: v ?? NaN };
  }).filter((x) => Number.isFinite(x.value)).sort((a, b) => a.date.localeCompare(b.date));
}

/** Sportart mit den meisten auswertbaren lockeren Einheiten. */
export function mainSport(sessions: EnduranceSession[]): Sport | null {
  const counts: [Sport, number][] = (['run', 'bikeIndoor'] as Sport[]).map((s) => [s, efficiencySeries(sessions, s).length]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0]![1] > 0 ? counts[0]![0] : null;
}

/**
 * F17: Adhärenz ≥ 80 % und 6–8 Wochen ohne Fortschritt (aerobe Effizienz, Testwerte) → Plateau.
 */
export function endurancePlateau(eff: Point[], test: Point[], adherence: number | null, now = new Date()): PlateauResult {
  const tr = trend(eff, 56, now);
  const recentTests = test.filter((x) => t(x.date) >= now.getTime() - 84 * DAY);
  const testUp = recentTests.length >= 2 && recentTests[recentTests.length - 1]!.value > recentTests[0]!.value * 1.02;
  const detail: string[] = [];
  if (testUp) detail.push('Letzter Feldtest besser als der vorige.');
  if (tr.trend === 'unclear' && !testUp) {
    return { plateau: false, reason: 'Noch zu wenige lockere Einheiten mit Puls für eine Aussage (mind. 4 über 4 Wochen).', detail };
  }
  if (adherence !== null && adherence < 0.8) {
    return { plateau: false, reason: `Erst regelmäßig trainieren: ${Math.round(adherence * 100)} % der geplanten Einheiten erledigt (Ziel ≥ 80 %).`, detail };
  }
  if (tr.trend === 'up' || testUp) return { plateau: false, reason: 'Deine Ausdauer verbessert sich.', detail };
  return { plateau: true, reason: 'Seit 8 Wochen keine messbare Verbesserung bei gleichem Puls und keine besseren Testwerte.', detail };
}

// ---------- Erholung vor Plateau-Reaktion prüfen (F17) ----------

export function recoveryIssue(checkins: CheckIn[], now = new Date()): string | null {
  const recent = checkins.filter((c) => t(c.date) >= now.getTime() - 14 * DAY);
  if (recent.length < 5) return null;
  const avg = (f: (c: CheckIn) => number) => recent.reduce((a, c) => a + f(c), 0) / recent.length;
  const sleep = avg((c) => c.sleepH);
  const stress = avg((c) => c.stress);
  const issues: string[] = [];
  if (sleep < 7) issues.push(`Schlaf im Schnitt nur ${sleep.toLocaleString('de-DE', { maximumFractionDigits: 1 })} h`);
  if (stress >= 3.5) issues.push('Stress häufig hoch');
  return issues.length ? `${issues.join(', ')} – das bremst den Fortschritt oft stärker als der Trainingsplan.` : null;
}

// ---------- Wochen ----------

export interface WeekStat {
  weekStart: string;
  strengthMin: number;
  enduranceMin: number;
  hardSets: number;
  /** sRPE × Minuten – nur Anzeige (F19) */
  load: number;
  planned: number;
  done: number;
}

export function weeklyStats(
  weekStarts: string[], plans: WeekPlan[], strength: StrengthSession[], endurance: EnduranceSession[],
  rirOffset: number, today = todayKey()
): WeekStat[] {
  return weekStarts.map((ws) => {
    const end = todayKey(new Date(t(ws) + 7 * DAY));
    const inWeek = (iso: string) => { const d = todayKey(new Date(iso)); return d >= ws && d < end; };
    const st = strength.filter((s) => s.status === 'done' && s.kind === 'strength' && inWeek(s.startedAt));
    const en = endurance.filter((s) => inWeek(s.date));
    const strengthMin = st.reduce((a, s) => a + (s.finishedAt ? Math.max(1, Math.round((t(s.finishedAt) - t(s.startedAt)) / 60000)) : s.plannedMinutes), 0);
    const enduranceMin = en.reduce((a, s) => a + s.durationMin, 0);
    const hardSets = st.reduce((a, s) => a + s.sets.filter((x) => isHardSet(x.reps, x.rir, rirOffset)).length, 0);
    const load = st.reduce((a, s) => a + (s.sRpe ?? 0) * s.plannedMinutes, 0) + en.reduce((a, s) => a + s.sRpe * s.durationMin, 0);
    let planned = 0;
    let done = 0;
    const plan = plans.find((w) => w.weekStart === ws);
    for (const day of plan?.days ?? []) {
      for (const it of day.items) {
        const s = itemStatus(it, day.date, today, strength, endurance, day.items);
        if (s === 'done') { done++; planned++; } else if (s === 'missed') planned++;
      }
    }
    return { weekStart: ws, strengthMin, enduranceMin, hardSets, load, planned, done };
  });
}

/** Anteil erledigter geplanter Einheiten; null bei zu wenig Planung (< 3 fällige Einheiten). */
export function adherence(stats: WeekStat[]): number | null {
  const planned = stats.reduce((a, s) => a + s.planned, 0);
  if (planned < 3) return null;
  return stats.reduce((a, s) => a + s.done, 0) / planned;
}

/** Nachsichtige Wochen-Serie (F23): eine ausgelassene Einheit pro Woche zählt nicht; laufende Woche zählt erst, wenn erfüllt. */
export function streakWeeks(stats: WeekStat[]): number {
  let streak = 0;
  for (let i = stats.length - 1; i >= 0; i--) {
    const s = stats[i]!;
    const ok = s.planned === 0 ? s.strengthMin + s.enduranceMin > 0 : s.done > 0 && s.done >= s.planned - 1;
    if (ok) streak++;
    else if (i === stats.length - 1) continue;
    else break;
  }
  return streak;
}

// ---------- Plateau-Reaktionen ----------

export const MAX_VOLUME_BOOST = 4; // +4 Sätze/Muskel/Woche über Basis → max. ~16–20 (K18)
