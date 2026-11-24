// Kraft-Engine. Reine Funktionen ohne UI/DB – vollständig testbar.
// Regel-IDs verweisen auf reports/Evidenzbasis Fitness Coach App.md
import { EXERCISES, EXERCISE_BY_ID, PATTERNS, PATTERN_BY_ID, TECHNIQUE_LABELS } from './exercises';
import type {
  Exercise, FeedbackReason, LadderStep, Level, Muscle, PatternId, PatternState, PlannedExercise,
  Profile, SetLog, StrengthSession, Technique
} from './types';

export const MAX_REPS = 30; // K6
export const DEFAULT_WINDOW: [number, number] = [8, 20]; // K7
export const CALIBRATION_EVERY_DAYS = 10; // K9 (alle 1–2 Wochen)

export interface Change {
  ruleId: string;
  what: string;
  why: string;
  prev: PatternState;
  next: PatternState;
}

// ---------- Verfügbarkeit & Leitern ----------

export function exerciseAvailable(ex: Exercise, p: Profile): boolean {
  const r = ex.requires;
  if (ex.band && p.equipment.bands.length === 0) return false;
  if (r?.kettlebell && p.equipment.kettlebellsKg.length === 0) return false;
  if (r?.dumbbell && p.equipment.dumbbellsKg.length === 0) return false;
  if (r?.anchorsAny && !r.anchorsAny.some((a) => p.equipment.anchors[a])) return false;
  const hurt = new Set(p.health.injuries.filter((i) => i.current).map((i) => i.region));
  if (ex.regions.some((reg) => hurt.has(reg))) return false;
  return true;
}

/** Flache Leiter eines Musters: jede Bandübung erzeugt eine Stufe pro Bandstärke. */
export function ladder(pattern: PatternId, p: Profile, blocked: string[] = []): LadderStep[] {
  const steps: LadderStep[] = [];
  for (const ex of EXERCISES) {
    if (ex.pattern !== pattern || blocked.includes(ex.id) || !exerciseAvailable(ex, p)) continue;
    if (ex.band) {
      for (const b of p.equipment.bands) steps.push({ exerciseId: ex.id, bandLevel: b.level });
    } else {
      steps.push({ exerciseId: ex.id });
    }
  }
  return steps;
}

export function sameStep(a: LadderStep, b: LadderStep): boolean {
  return a.exerciseId === b.exerciseId && (a.bandLevel ?? 0) === (b.bandLevel ?? 0);
}

/** Position der Stufe in der Leiter; fehlt sie (z. B. Übung blockiert), die nächstliegende. */
export function stepIndex(steps: LadderStep[], step: LadderStep): number {
  const exact = steps.findIndex((s) => sameStep(s, step));
  if (exact >= 0) return exact;
  // gleiche Übung, andere Bandstufe
  const sameEx = steps.findIndex((s) => s.exerciseId === step.exerciseId);
  if (sameEx >= 0) return sameEx;
  // Übung nicht mehr verfügbar: Position anhand der Katalogreihenfolge schätzen
  const order = EXERCISES.findIndex((e) => e.id === step.exerciseId);
  const idx = steps.findIndex((s) => EXERCISES.findIndex((e) => e.id === s.exerciseId) >= order);
  return idx >= 0 ? idx : Math.max(0, steps.length - 1);
}

export function stepLabel(step: LadderStep, p?: Profile): string {
  const ex = EXERCISE_BY_ID[step.exerciseId];
  const name = ex?.name ?? step.exerciseId;
  if (step.bandLevel === undefined) return name;
  const band = p?.equipment.bands.find((b) => b.level === step.bandLevel);
  return `${name} · Band ${step.bandLevel}${band?.label ? ` (${band.label})` : ''}`;
}

export function windowFor(step: LadderStep): [number, number] {
  return EXERCISE_BY_ID[step.exerciseId]?.repWindow ?? DEFAULT_WINDOW;
}

// ---------- Einstufung ----------

const LEVEL_START: Record<Level, number> = { none: 0, some: 0.15, regular: 0.35, advanced: 0.5 };

export function initialState(pattern: PatternId, p: Profile): PatternState | null {
  const steps = ladder(pattern, p);
  if (steps.length === 0) return null;
  const idx = Math.min(steps.length - 1, Math.floor(steps.length * LEVEL_START[p.experience.strength]));
  return {
    id: `${p.id}:${pattern}`, profileId: p.id, pattern, step: steps[idx]!, placed: false, history: [], blocked: []
  };
}

/**
 * Einstufungssatz bis ca. 1 RIR. Ziel: im Wiederholungsfenster landen.
 * Gibt die nächste zu testende Stufe zurück oder `done`.
 */
export function placementNext(
  steps: LadderStep[], current: LadderStep, reps: number, attempt: number
): { done: boolean; step: LadderStep; note: string } {
  const i = stepIndex(steps, current);
  const [lo, hi] = windowFor(current);
  const last = steps.length - 1;
  if (attempt >= 3) return { done: true, step: current, note: 'Nach 3 Versuchen übernommen – die Progression korrigiert den Rest.' };
  if (reps > MAX_REPS) {
    if (i >= last) return { done: true, step: current, note: 'Schwerste Variante erreicht – wird mit Intensivierung trainiert.' };
    return { done: false, step: steps[Math.min(last, i + 2)]!, note: `${reps} Wdh. sind zu leicht – zwei Stufen schwerer.` };
  }
  if (reps > hi) {
    if (i >= last) return { done: true, step: current, note: 'Schwerste Variante erreicht.' };
    return { done: false, step: steps[i + 1]!, note: `${reps} Wdh. – eine Stufe schwerer testen.` };
  }
  if (reps < lo) {
    if (i <= 0) return { done: true, step: current, note: 'Leichteste Variante – passt als Start.' };
    return { done: false, step: steps[i - 1]!, note: `${reps} Wdh. sind zu wenig – eine Stufe leichter.` };
  }
  return { done: true, step: current, note: `${reps} Wdh. liegen im Zielbereich ${lo}–${hi}. Passt.` };
}

// ---------- RIR-Kalibrierung (K9) ----------

/** Positiver Offset = Nutzer unterschätzt seine Reserve (hätte mehr geschafft). */
export function updateRirOffset(oldOffset: number, c: { stopReps: number; estRir: number; totalReps: number }): number {
  const actual = Math.max(0, c.totalReps - c.stopReps);
  const error = actual - c.estRir;
  const next = 0.6 * oldOffset + 0.4 * error;
  return Math.round(Math.max(-1, Math.min(4, next)) * 10) / 10;
}

export function correctedRir(rir: number, offset: number): number {
  return Math.max(0, rir + offset);
}

/** K5: zählt als harter Satz? */
export function isHardSet(reps: number, rir: number, offset: number): boolean {
  const r = correctedRir(rir, offset);
  if (reps > 25) return r <= 1;
  return r <= 3;
}

export function calibrationDue(lastCalibrationAt: string | null, now = new Date()): boolean {
  if (!lastCalibrationAt) return true;
  return now.getTime() - new Date(lastCalibrationAt).getTime() >= CALIBRATION_EVERY_DAYS * 86400000;
}

// ---------- Progression nach einer Einheit ----------

const TECHNIQUE_ORDER: Technique[] = ['stretchPause', 'slowEccentric', 'restPause', 'lengthenedPartials'];

function nextTechnique(t?: Technique): Technique {
  if (!t) return TECHNIQUE_ORDER[0]!;
  const i = TECHNIQUE_ORDER.indexOf(t);
  return TECHNIQUE_ORDER[(i + 1) % TECHNIQUE_ORDER.length]!;
}

function moveTo(state: PatternState, step: LadderStep): PatternState {
  return { ...state, step, technique: undefined, history: [], underloaded: false };
}

/**
 * Doppelte Progression (K10), Zwangswechsel > 30 Wdh. (K6), Zu-schwer-Regel, Plateau (K18), Unterlast (K17).
 * `sets` = Arbeitssätze dieses Musters auf der geplanten Stufe (ohne Kalibrierungs-Zusatzwdh.).
 */
export function progress(
  state: PatternState, sets: SetLog[], p: Profile, rirOffset: number, date: string
): { state: PatternState; change: Change | null } {
  const work = sets.filter((s) => sameStep(s, state.step));
  if (work.length === 0) return { state, change: null };
  const steps = ladder(state.pattern, p, state.blocked);
  const i = stepIndex(steps, state.step);
  const last = steps.length - 1;
  const [lo, hi] = windowFor(state.step);
  const label = (s: LadderStep) => stepLabel(s, p);
  const first = work[0]!;
  const eff = first.reps + correctedRir(first.rir, rirOffset);
  const mk = (next: PatternState, ruleId: string, what: string, why: string) =>
    ({ state: next, change: { ruleId, what, why, prev: state, next } });

  const maxReps = Math.max(...work.map((s) => s.reps));
  if (maxReps > MAX_REPS) {
    if (i < last) {
      const target = steps[Math.min(last, i + (maxReps > 40 ? 2 : 1))]!;
      return mk(moveTo(state, target), 'K6', `${label(state.step)} → ${label(target)}`,
        `${maxReps} Wdh. in einem Satz – über 30 Wdh. ist der Reiz für Muskelaufbau unsicher. Schwerere Variante.`);
    }
    const next: PatternState = {
      ...state, underloaded: true, technique: state.technique ?? 'lengthenedPartials',
      history: [...state.history, { date, eff }].slice(-6)
    };
    return mk(next, 'K17', `${label(state.step)}: Intensivierung`,
      `Schwerste verfügbare Variante und trotzdem ${maxReps} Wdh. Ab jetzt Intensivierung im letzten Satz.`);
  }

  const allTop = work.length >= 2 && work.every((s) => s.reps >= hi && correctedRir(s.rir, rirOffset) <= 3);
  const easy = work.every((s) => s.reps >= hi) && work.some((s) => correctedRir(s.rir, rirOffset) >= 4);
  if ((allTop || easy) && i < last) {
    const target = steps[i + 1]!;
    return mk(moveTo(state, target), 'K10', `${label(state.step)} → ${label(target)}`,
      `Alle Sätze am oberen Ende (${hi} Wdh.) erreicht – nächste Stufe, Start wieder bei ${lo} Wdh.`);
  }

  if (first.reps < lo && correctedRir(first.rir, rirOffset) <= 1 && i > 0) {
    const target = steps[i - 1]!;
    return mk(moveTo(state, target), 'K7', `${label(state.step)} → ${label(target)}`,
      `Nur ${first.reps} Wdh. im ersten Satz – unter dem Zielbereich ${lo}–${hi}. Eine Stufe leichter.`);
  }

  // auf der Stufe bleiben, Verlauf fortschreiben
  const history = [...state.history, { date, eff }].slice(-6);
  const lastThree = history.slice(-3);
  const plateau = lastThree.length === 3 && lastThree[2]!.eff <= lastThree[0]!.eff;
  if (plateau) {
    if (i < last && state.technique) {
      // Intensivierung hat nicht geholfen → nächste Stufe probieren (K18)
      const target = steps[i + 1]!;
      return mk(moveTo(state, target), 'K18', `${label(state.step)} → ${label(target)}`,
        'Drei Einheiten ohne Fortschritt trotz Intensivierung – neue Variante als neuer Reiz.');
    }
    const t = nextTechnique(state.technique);
    const next: PatternState = { ...state, technique: t, history: [] };
    return mk(next, 'K18', `${label(state.step)}: ${TECHNIQUE_LABELS[t]}`,
      'Drei Einheiten ohne Steigerung der Wiederholungen (Wdh. + Reserve). Neuer Reiz über Intensivierung.');
  }
  return { state: { ...state, history }, change: null };
}

// ---------- Rückmeldung „Klappt nicht" ----------

export const FEEDBACK_LABELS: Record<FeedbackReason, string> = {
  anchor: 'Aufbau / Anker klappt nicht',
  pain: 'Schmerzen',
  tooEasy: 'Viel zu leicht',
  tooHard: 'Viel zu schwer',
  technique: 'Bewegung unklar / unsicher',
  dislike: 'Mag ich nicht'
};

/** Tauscht die Stufe nach Rückmeldung. Gibt null zurück, wenn keine Alternative existiert. */
export function swapAfterFeedback(
  state: PatternState, reason: FeedbackReason, p: Profile
): { state: PatternState; change: Change } | null {
  const label = (s: LadderStep) => stepLabel(s, p);
  if (reason === 'tooEasy' || reason === 'tooHard') {
    const steps = ladder(state.pattern, p, state.blocked);
    const i = stepIndex(steps, state.step);
    const j = reason === 'tooEasy' ? i + 1 : i - 1;
    if (reason === 'tooEasy' && j >= steps.length) {
      // Keine schwerere Variante verfügbar → Intensivierung (K17)
      const t = nextTechnique(state.technique);
      const next: PatternState = { ...state, technique: t, underloaded: true };
      return {
        state: next,
        change: {
          ruleId: 'K17', what: `${label(state.step)}: ${TECHNIQUE_LABELS[t]}`,
          why: 'Zu leicht, aber keine schwerere Variante mit deinem Equipment verfügbar. Mehr Reiz über Intensivierung.',
          prev: state, next
        }
      };
    }
    if (j < 0 || j >= steps.length) return null;
    const next = moveTo(state, steps[j]!);
    return {
      state: next,
      change: { ruleId: 'F21', what: `${label(state.step)} → ${label(next.step)}`, why: `Deine Rückmeldung: ${FEEDBACK_LABELS[reason]}.`, prev: state, next }
    };
  }
  const blocked = [...new Set([...state.blocked, state.step.exerciseId])];
  const steps = ladder(state.pattern, p, blocked);
  if (steps.length === 0) return null;
  const ref = ladder(state.pattern, p, state.blocked);
  const pos = stepIndex(ref, state.step) / Math.max(1, ref.length - 1);
  const target = steps[Math.round(pos * (steps.length - 1))]!;
  const next: PatternState = { ...moveTo(state, target), blocked };
  return {
    state: next,
    change: {
      ruleId: 'F21', what: `${label(state.step)} → ${label(target)}`,
      why: `Deine Rückmeldung: ${FEEDBACK_LABELS[reason]}. Übung ausgeschlossen, ähnlich schwere Alternative gewählt.`,
      prev: state, next
    }
  };
}

// ---------- Wochenvolumen (K1–K4) ----------

/** Wochenziel harte Sätze je Muskel; `boost` = Plateau-Zuschlag (K18, max. ~20). */
export function weeklyTarget(p: Profile, m: Muscle, boost = 0): number {
  if (m === 'core' || m === 'calves') return 6 + Math.floor(boost / 2);
  const f = p.goals.focus;
  const base = f <= 40 ? 12 : f < 60 ? 10 : 8;
  return Math.min(20, base + boost);
}

/** Fraktionale harte Sätze pro Muskel im Zeitraum (K2, K5). */
export function muscleVolume(
  sessions: StrengthSession[], rirOffset: number, since: Date
): Record<Muscle, number> {
  const vol = {} as Record<Muscle, number>;
  for (const s of sessions) {
    for (const set of s.sets) {
      if (new Date(set.at) < since) continue;
      if (!isHardSet(set.reps, set.rir, rirOffset)) continue;
      const ex = EXERCISE_BY_ID[set.exerciseId];
      if (!ex) continue;
      for (const [m, w] of Object.entries(ex.muscles) as [Muscle, number][]) {
        vol[m] = (vol[m] ?? 0) + w;
      }
    }
  }
  return vol;
}

// ---------- Einheit zusammenstellen ----------

export function restFor(ex: Exercise, minutes: number): number {
  if (minutes <= 25) return ex.heavyLegs ? 90 : 60; // Effizienzmodus
  return ex.heavyLegs ? 120 : 75; // K15
}

export function setSeconds(ex: Exercise, rest: number): number {
  return (ex.unilateral ? 80 : 45) + rest;
}

export function primaryMuscle(ex: Exercise): Muscle {
  return (Object.entries(ex.muscles) as [Muscle, number][]).sort((a, b) => b[1] - a[1])[0]![0];
}

/**
 * Baut eine Krafteinheit für die verfügbare Zeit: Muster mit dem größten Wochendefizit zuerst,
 * 2–4 Sätze pro Muster, max. ~8 direkte Sätze pro Muskel und Einheit (K3), Fertigkeit/Grundübung zuerst (K16).
 */
export function buildSession(
  p: Profile, states: PatternState[], recent: StrengthSession[], minutes: number,
  opts: { rirOffset: number; calibrate: boolean; now?: Date; volumeBoost?: number }
): PlannedExercise[] {
  const now = opts.now ?? new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const vol = muscleVolume(recent, opts.rirOffset, weekAgo);
  const budget = Math.max(8, minutes - 5) * 60; // 5 min Aufwärmen
  const perSession: Partial<Record<Muscle, number>> = {};

  const candidates = states
    .filter((s) => EXERCISE_BY_ID[s.step.exerciseId] && ladder(s.pattern, p, s.blocked).length > 0)
    .map((s) => {
      const ex = EXERCISE_BY_ID[s.step.exerciseId]!;
      const m = primaryMuscle(ex);
      const target = weeklyTarget(p, m, opts.volumeBoost ?? 0);
      const deficit = (target - (vol[m] ?? 0)) / target;
      const info = PATTERN_BY_ID[s.pattern];
      return { s, ex, m, score: deficit + (info.compound ? 0.35 : 0) };
    })
    .sort((a, b) => b.score - a.score);

  const plan: PlannedExercise[] = [];
  let used = 0;
  // Plateau-Zuschlag (K18): +1 Satz je Muster, wenn die Zeit reicht
  const setsPer = (minutes >= 50 ? 4 : minutes >= 30 ? 3 : 2) + ((opts.volumeBoost ?? 0) > 0 && minutes >= 30 ? 1 : 0);
  for (const c of candidates) {
    if (c.score <= -0.2 && plan.length >= 3) continue; // Muskel diese Woche schon gut versorgt
    const rest = restFor(c.ex, minutes);
    const per = setSeconds(c.ex, rest);
    let sets = setsPer;
    while (sets > 1 && used + sets * per > budget) sets--;
    if (used + sets * per > budget) continue;
    const over = (Object.entries(c.ex.muscles) as [Muscle, number][])
      .some(([m, w]) => (perSession[m] ?? 0) + w * sets > 8);
    if (over) continue;
    for (const [m, w] of Object.entries(c.ex.muscles) as [Muscle, number][]) {
      perSession[m] = (perSession[m] ?? 0) + w * sets;
    }
    used += sets * per;
    plan.push({
      pattern: c.s.pattern, exerciseId: c.s.step.exerciseId, bandLevel: c.s.step.bandLevel, sets,
      repWindow: windowFor(c.s.step), restSec: rest, calibrationLastSet: false, technique: c.s.technique
    });
  }

  plan.sort((a, b) => {
    const ea = EXERCISE_BY_ID[a.exerciseId]!;
    const eb = EXERCISE_BY_ID[b.exerciseId]!;
    if (!!ea.skill !== !!eb.skill) return ea.skill ? -1 : 1;
    return PATTERN_BY_ID[a.pattern].order - PATTERN_BY_ID[b.pattern].order;
  });

  if (opts.calibrate) {
    const target = [...plan].reverse().find((x) => EXERCISE_BY_ID[x.exerciseId]!.safeToFailure);
    if (target) target.calibrationLastSet = true;
  }
  return plan;
}

export function estimateMinutes(plan: PlannedExercise[]): number {
  const sec = plan.reduce((t, x) => t + x.sets * setSeconds(EXERCISE_BY_ID[x.exerciseId]!, x.restSec), 0);
  return Math.round(sec / 60) + 5;
}

export const ALL_PATTERNS = PATTERNS.map((p) => p.id);
