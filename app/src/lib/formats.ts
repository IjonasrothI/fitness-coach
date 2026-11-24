// Trainingsformen, Stimmung, Motivation und Rekorde (M7). Reine Funktionen – testbar.
// Leitidee (F23): Dranbleiben schlägt den perfekten Plan. Abwechslung und eine niedrige Hürde
// halten Menschen beim Training, die Krafttraining nicht von sich aus mögen.
import { EXERCISE_BY_ID, PATTERN_BY_ID } from './exercises';
import type { CircuitSpec, Mood, Motivation, PlannedExercise, SetLog, StrengthFormat, StrengthSession } from './types';

export const FORMAT_LABELS: Record<StrengthFormat, string> = { classic: 'Klassisch', timed: 'Zeit-Sätze', circuit: 'Zirkel' };
export const FORMAT_INFO: Record<StrengthFormat, string> = {
  classic: 'Wiederholungsziel mit etwas Reserve, Pause zwischen den Sätzen.',
  timed: '45 s so viele saubere Wiederholungen wie möglich – mit Countdown und Ansagen.',
  circuit: '40 s Arbeit, 20 s Pause, Übungen im Wechsel – mehrere Runden.'
};
export const MOOD_LABELS: Record<Mood, string> = { push: 'Fordernd', easy: 'Locker', short: 'Kurz' };
export const MOOD_INFO: Record<Mood, string> = {
  push: 'Volle Einheit, nah an deiner Grenze.',
  easy: 'Bewusst mit Luft (3–4 Wdh. Reserve), keine Eingaben zwischendurch. Zählt trotzdem.',
  short: 'Kompakter Zirkel, höchstens 20 Minuten.'
};
export const MOTIVATION_LABELS: Record<Motivation, string> = { progress: 'Fortschritt sehen', variety: 'Abwechslung', quick: 'Kurz und fertig' };
export const MOTIVATION_INFO: Record<Motivation, string> = {
  progress: 'Meist klassisch mit klaren Zahlen und Rekorden, ab und zu Zeit-Sätze.',
  variety: 'Klassisch, Zeit-Sätze und Zirkel im Wechsel.',
  quick: 'Vor allem Zirkel und Zeit-Sätze – kompakt, kaum Pausen, wenig Eingaben.'
};

export const TIMED_SEC = 45;
export const TIMED_SEC_PER_SIDE = 30;
export const CIRCUIT: Omit<CircuitSpec, 'rounds'> = { workSec: 40, restSec: 20, roundRestSec: 60 };

/** Eignet sich für Zeit-Sätze und Zirkel? Keine Fertigkeits- und Niedrig-Wdh.-Übungen unter Zeitdruck (K8). */
export function timedOk(exerciseId: string): boolean {
  const ex = EXERCISE_BY_ID[exerciseId];
  if (!ex) return false;
  return !ex.skill && (ex.repWindow?.[1] ?? 20) > 10;
}

const CYCLES: Record<Motivation, StrengthFormat[]> = {
  progress: ['classic', 'classic', 'timed'],
  variety: ['classic', 'timed', 'circuit'],
  quick: ['circuit', 'timed']
};

/** Automatische Wahl des Formats – angezeigt und übersteuerbar (F21). */
export function chooseFormat(o: {
  motivation?: Motivation; mood: Mood; minutes: number; recentCount: number; calibrate: boolean;
}): { format: StrengthFormat; why: string } {
  const mot = o.motivation ?? 'variety';
  if (o.mood === 'short' || o.minutes <= 15) return { format: 'circuit', why: 'Wenig Zeit: kompakter Zirkel ohne lange Pausen.' };
  if (o.mood === 'easy') {
    const f: StrengthFormat = mot === 'quick' || o.recentCount % 2 ? 'circuit' : 'timed';
    return { format: f, why: 'Locker: Zeit statt Wiederholungsziel, mit Luft nach oben.' };
  }
  if (o.calibrate && mot !== 'quick') {
    return { format: 'classic', why: 'Heute ist ein Kalibrierungssatz fällig (K9) – dafür braucht es das klassische Format.' };
  }
  const cyc = CYCLES[mot];
  const format = cyc[o.recentCount % cyc.length]!;
  return { format, why: `Weil dich „${MOTIVATION_LABELS[mot]}“ motiviert: ${MOTIVATION_INFO[mot]}` };
}

export function stationCount(minutes: number): number {
  return minutes <= 12 ? 3 : minutes <= 25 ? 4 : minutes < 40 ? 5 : 6;
}

export function circuitSpec(minutes: number, stations: number, deload = false): CircuitSpec {
  const roundSec = stations * (CIRCUIT.workSec + CIRCUIT.restSec) + CIRCUIT.roundRestSec;
  const avail = (minutes - (minutes >= 20 ? 4 : 0)) * 60; // ab 20 min kurzes Aufwärmen
  let rounds = Math.max(2, Math.min(5, Math.floor((avail + CIRCUIT.roundRestSec) / roundSec)));
  if (deload) rounds = Math.max(2, Math.ceil(rounds / 2));
  return { ...CIRCUIT, rounds };
}

/** Unter- und Oberkörper abwechseln – so erholt sich die eine Hälfte, während die andere arbeitet. */
function alternate(list: PlannedExercise[]): PlannedExercise[] {
  const lower = list.filter((x) => PATTERN_BY_ID[x.pattern].half === 'lower');
  const upper = list.filter((x) => PATTERN_BY_ID[x.pattern].half === 'upper');
  const out: PlannedExercise[] = [];
  while (lower.length || upper.length) {
    const a = lower.shift();
    if (a) out.push(a);
    const b = upper.shift();
    if (b) out.push(b);
  }
  return out;
}

export interface Shaped {
  plan: PlannedExercise[];
  format: StrengthFormat;
  circuit?: CircuitSpec;
  notes: string[];
}

/**
 * Formt eine geplante Einheit in das gewählte Format.
 * Für den Zirkel sollte `plan` großzügig geplant sein (mehr Muster als Stationen), Priorität = Reihenfolge der Auswahl.
 */
export function shapePlan(plan: PlannedExercise[], format: StrengthFormat, mood: Mood, minutes: number, deload = false): Shaped {
  const notes: string[] = [];
  let out = plan.map((x) => ({ ...x }));
  if (mood === 'easy') {
    out = out.map((x) => ({ ...x, minRir: Math.max(x.minRir ?? 0, 3), technique: undefined, calibrationLastSet: false }));
    notes.push('Locker: 3–4 Wdh. Reserve. Diese Einheit zählt fürs Wochenvolumen, verändert aber deine Stufen nicht.');
  }
  if (format === 'classic') return { plan: out, format, notes };

  if (format === 'circuit') {
    const ok = out.filter((x) => timedOk(x.exerciseId));
    if (ok.length >= 3) {
      const n = Math.min(ok.length, stationCount(minutes));
      // Grundübungen bevorzugen, dann Wochendefizit (= Reihenfolge der Planung); Unter- und Oberkörper ausgewogen
      const picked = alternate([...ok].sort((a, b) => Number(PATTERN_BY_ID[b.pattern].compound) - Number(PATTERN_BY_ID[a.pattern].compound))).slice(0, n);
      const spec = circuitSpec(minutes, n, deload);
      const stations = alternate(picked).map((x) => ({
        ...x, sets: spec.rounds, workSec: spec.workSec, restSec: spec.restSec, calibrationLastSet: false, technique: undefined
      }));
      const left = out.filter((x) => !timedOk(x.exerciseId)).map((x) => EXERCISE_BY_ID[x.exerciseId]!.name);
      if (left.length) notes.push(`Nicht im Zirkel (Technik braucht Ruhe): ${left.join(', ')}.`);
      return { plan: stations, format, circuit: spec, notes };
    }
    notes.push('Zu wenige passende Übungen für einen Zirkel – heute Zeit-Sätze.');
    format = 'timed';
  }

  // Zeit-Sätze
  out = out.map((x) => {
    if (!timedOk(x.exerciseId)) return x;
    const uni = EXERCISE_BY_ID[x.exerciseId]!.unilateral;
    return { ...x, workSec: uni ? TIMED_SEC_PER_SIDE : TIMED_SEC, restSec: Math.min(x.restSec, 90), calibrationLastSet: false };
  });
  const classic = out.filter((x) => !x.workSec).map((x) => EXERCISE_BY_ID[x.exerciseId]!.name);
  if (classic.length) notes.push(`Bleibt klassisch (Fertigkeit, wenige Wdh.): ${classic.join(', ')}.`);
  return { plan: out, format, notes };
}

/** Dauer eines Satzes inkl. Pause in s (für die Zeitschätzung). */
export function workSeconds(x: PlannedExercise): number {
  const ex = EXERCISE_BY_ID[x.exerciseId]!;
  if (x.workSec) return x.workSec * (ex.unilateral && x.workSec === TIMED_SEC_PER_SIDE ? 2 : 1) + 10;
  return ex.unilateral ? 80 : 45;
}

export function estimateShaped(plan: PlannedExercise[], circuit?: CircuitSpec): number {
  if (circuit) {
    const per = plan.length * (circuit.workSec + circuit.restSec);
    const sec = circuit.rounds * per + (circuit.rounds - 1) * circuit.roundRestSec;
    return Math.round(sec / 60) + (plan.length && circuit.rounds * per > 15 * 60 ? 4 : 1);
  }
  const sec = plan.reduce((t, x) => t + x.sets * (workSeconds(x) + x.restSec), 0);
  return Math.round(sec / 60) + 5;
}

// ---------- Persönliche Rekorde ----------

export interface PR {
  exerciseId: string;
  bandLevel?: number;
  workSec?: number;
  reps: number;
  prev: number;
}

const prKey = (s: SetLog) => `${s.exerciseId}|${s.bandLevel ?? ''}|${s.workSec ?? ''}`;

/** Neue Bestwerte dieser Einheit gegenüber allen früheren (ohne geschätzte Locker-Sätze). Erster Wert ist kein Rekord. */
export function newRecords(sets: SetLog[], history: StrengthSession[]): PR[] {
  const best = new Map<string, number>();
  for (const s of history) {
    if (s.status !== 'done') continue;
    for (const x of s.sets) {
      if (x.estimated) continue;
      best.set(prKey(x), Math.max(best.get(prKey(x)) ?? 0, x.reps));
    }
  }
  const cur = new Map<string, SetLog>();
  for (const x of sets) {
    if (x.estimated) continue;
    const k = prKey(x);
    if (!cur.has(k) || x.reps > cur.get(k)!.reps) cur.set(k, x);
  }
  const out: PR[] = [];
  for (const [k, x] of cur) {
    const prev = best.get(k);
    if (prev !== undefined && x.reps > prev) out.push({ exerciseId: x.exerciseId, bandLevel: x.bandLevel, workSec: x.workSec, reps: x.reps, prev });
  }
  return out;
}

export function prText(r: PR): string {
  const name = EXERCISE_BY_ID[r.exerciseId]?.name ?? r.exerciseId;
  const band = r.bandLevel !== undefined ? ` (Band ${r.bandLevel})` : '';
  return r.workSec ? `${name}${band}: ${r.reps} Wdh. in ${r.workSec} s (vorher ${r.prev})` : `${name}${band}: ${r.reps} Wdh. (vorher ${r.prev})`;
}
