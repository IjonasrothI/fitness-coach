// Datenmodell. Regel-IDs (K/E/F/T) verweisen auf reports/Evidenzbasis Fitness Coach App.md

export type Sex = 'female' | 'male' | 'diverse';

export type BodyRegion =
  | 'neck' | 'shoulder' | 'elbow' | 'wrist' | 'upperBack' | 'lowerBack'
  | 'hip' | 'knee' | 'ankle' | 'achilles' | 'foot' | 'other';

export interface Injury {
  region: BodyRegion;
  note: string;
  /** true = aktuell problematisch; false = Vorgeschichte */
  current: boolean;
}

/** PAR-Q+ (sinngemäß, 7 allgemeine Fragen) – F25 */
export type ParqKey =
  | 'heartCondition' | 'chestPain' | 'dizziness' | 'chronicCondition'
  | 'medication' | 'boneJoint' | 'supervision';

export interface HealthInfo {
  parq: Record<ParqKey, boolean>;
  screenedAt: string; // ISO
  /** Ärztliche Freigabe nach einem PAR-Q-„Ja" */
  medicalClearanceAt?: string;
  injuries: Injury[];
  notes: string;
}

export type GoalArea =
  | 'muscle' | 'strength' | 'running' | 'cycling' | 'bodyComposition'
  | 'mobility' | 'health';

export interface Goals {
  /** 0 = nur Kraft, 100 = nur Ausdauer */
  focus: number;
  areas: GoalArea[];
  specificGoal: string;
  /** Prozessziel (F23) */
  sessionsPerWeek: number;
}

export type Level = 'none' | 'some' | 'regular' | 'advanced';

export interface Experience {
  strength: Level;
  running: Level;
  cycling: Level;
  runKmPerWeek: number;
  /** Startwert für Einzellauf-Regel (E14) */
  longestRunLast30dKm: number;
  cycleHoursPerWeek: number;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Montag

export interface Availability {
  days: Weekday[];
  typicalMinutes: number;
  allowDoubleSessions: boolean;
}

export interface BandSpec {
  level: number; // 1..n, aufsteigend
  label: string;
}

export type AnchorKey = 'door' | 'table' | 'sofa' | 'fixedObject' | 'stairs' | 'chair';

export interface Equipment {
  dumbbellsKg: number[];
  kettlebellsKg: number[];
  bands: BandSpec[];
  anchors: Record<AnchorKey, boolean>;
}

export interface EnduranceSetup {
  restingHr?: number;
  /** gemessenes Maximum; ersetzt Formel (E3) */
  maxHrMeasured?: number;
  runOutdoor: boolean;
  bikeOutdoor: boolean;
  bikeIndoor: boolean;
  bikeIndoorPower: boolean;
}

export interface Profile {
  id: string;
  name: string;
  birthYear: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  health: HealthInfo;
  goals: Goals;
  experience: Experience;
  availability: Availability;
  equipment: Equipment;
  endurance: EnduranceSetup;
  /** F28: nur mit Einwilligung */
  cycleTrackingConsent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeightEntry {
  id?: number;
  profileId: string;
  date: string; // YYYY-MM-DD
  kg: number;
}

/** Änderungsprotokoll (F21) – wird ab M5 befüllt */
export interface ChangeLogEntry {
  id?: number;
  profileId: string;
  at: string;
  ruleId: string;
  what: string;
  why: string;
  undone?: boolean;
  /** Zustand vor/nach der Änderung, für „Rückgängig" */
  prev?: PatternState;
  next?: PatternState;
  sessionId?: string;
}

export interface Meta {
  key: string;
  value: unknown;
}

// ---------- Krafttraining (M2) ----------

export type Muscle =
  | 'chest' | 'shoulders' | 'triceps' | 'upperBack' | 'lats' | 'biceps'
  | 'quads' | 'glutes' | 'hamstrings' | 'calves' | 'core';

export type PatternId =
  | 'squat' | 'hinge' | 'hamstring' | 'hPush' | 'vPush' | 'hPull' | 'vPull'
  | 'biceps' | 'triceps' | 'lateral' | 'calves' | 'core';

/** Intensivierung im letzten Satz (K11) */
export type Technique = 'lengthenedPartials' | 'restPause' | 'slowEccentric' | 'stretchPause';

export interface Exercise {
  id: string;
  name: string;
  pattern: PatternId;
  /** Fraktionale Satzzählung (K2): Zielmuskel 1, Synergist 0,5 */
  muscles: Partial<Record<Muscle, number>>;
  /** Last über Bandstufen 1..n */
  band?: boolean;
  unilateral?: boolean;
  requires?: { anchorsAny?: AnchorKey[]; kettlebell?: boolean; dumbbell?: boolean };
  /** Belastete Regionen – bei aktueller Beschwerde ausgeschlossen */
  regions: BodyRegion[];
  /** Satz bis Muskelversagen vertretbar (K8) */
  safeToFailure: boolean;
  /** Schwere einbeinige Beinübung → längere Pause (K15) */
  heavyLegs?: boolean;
  /** Fertigkeitsübung → früh in der Einheit (K16) */
  skill?: boolean;
  repWindow?: [number, number];
  cues: string[];
}

export interface LadderStep {
  exerciseId: string;
  bandLevel?: number;
}

export interface PatternState {
  id: string; // `${profileId}:${pattern}`
  profileId: string;
  pattern: PatternId;
  step: LadderStep;
  placed: boolean;
  technique?: Technique;
  /** beste effektive Wdh. (Wdh. + korrigierte RIR) im ersten Satz, letzte Einheiten auf dieser Stufe */
  history: { date: string; eff: number }[];
  blocked: string[];
  /** K17: keine Variante führt innerhalb von ~30 Wdh. ans Versagen */
  underloaded?: boolean;
}

export interface CalibrationResult {
  stopReps: number;
  estRir: number;
  totalReps: number;
}

export interface SetLog {
  pattern: PatternId;
  exerciseId: string;
  bandLevel?: number;
  reps: number;
  rir: number;
  calibration?: CalibrationResult;
  at: string;
}

export interface PlannedExercise {
  pattern: PatternId;
  exerciseId: string;
  bandLevel?: number;
  sets: number;
  repWindow: [number, number];
  restSec: number;
  calibrationLastSet: boolean;
  technique?: Technique;
  /** Tagesform-Deckel (M4): mindestens so viele Wdh. in Reserve */
  minRir?: number;
}

export interface PainEntry {
  region: BodyRegion;
  score: number;
}

export interface StrengthSession {
  id: string;
  profileId: string;
  kind: 'strength' | 'placement';
  status: 'active' | 'done';
  startedAt: string;
  finishedAt?: string;
  plannedMinutes: number;
  plan: PlannedExercise[];
  sets: SetLog[];
  sRpe?: number;
  enjoyment?: number;
  pain?: PainEntry[];
}

export type FeedbackReason =
  | 'anchor' | 'pain' | 'tooEasy' | 'tooHard' | 'technique' | 'dislike';

export interface ExerciseFeedback {
  id?: number;
  profileId: string;
  exerciseId: string;
  bandLevel?: number;
  reason: FeedbackReason;
  note: string;
  at: string;
}

// ---------- Ausdauer (M3) ----------

export type Sport = 'run' | 'bikeOutdoor' | 'bikeIndoor';
export type EnduranceType = 'easy' | 'long' | 'tempo' | 'intervals' | 'test' | 'recovery';

export interface EnduranceSession {
  id: string;
  profileId: string;
  date: string; // ISO
  sport: Sport;
  type: EnduranceType;
  durationMin: number;
  distanceKm?: number;
  avgHr?: number;
  maxHr?: number;
  /** Rolle: Ø-Leistung der ganzen Einheit */
  avgPower?: number;
  /** Intervalle: Ø der Arbeitsintervalle (Lauf: s/km, Rolle: Watt) */
  intervalPaceSec?: number;
  intervalPower?: number;
  /** Ø-Puls der zweiten Hälfte (Drift) */
  hrSecondHalf?: number;
  elevationM?: number;
  sRpe: number;
  pain?: PainEntry[];
  note?: string;
}

export type TestKind = 'cs' | 'talkRun' | 'ftp20' | 'talkBike';

export interface EnduranceTest {
  id: string;
  profileId: string;
  date: string;
  kind: TestKind;
  /** cs: Dauer/Distanz zweier Maximalläufe */
  t1Sec?: number; d1M?: number; t2Sec?: number; d2M?: number;
  /** talkRun: Pace an der Sprechgrenze (s/km) + Puls */
  paceSec?: number;
  hr?: number;
  /** ftp20/talkBike: Watt */
  power?: number;
}

// ---------- Täglicher Check-in (M4) ----------

export type WarningSymptom = 'chestPain' | 'breathless' | 'palpitations' | 'fainting';

export interface CheckIn {
  id: string; // `${profileId}:${date}`
  profileId: string;
  date: string; // YYYY-MM-DD
  at: string;
  sleepH: number;
  /** 1–5, 5 = sehr gut */
  sleepQ: number;
  energy: number;
  /** 1–5, 5 = sehr starker Muskelkater */
  soreness: number;
  sorenessRegions: BodyRegion[];
  /** 1–5, 5 = sehr gestresst */
  stress: number;
  motivation: number;
  pain: PainEntry[];
  sick: boolean;
  warning: WarningSymptom[];
  restingHr?: number;
  period?: boolean;
  /** 0–3 */
  cycleSymptoms?: number;
  /** Nutzer übersteuert Gelb/Rot (F21) */
  override?: boolean;
}
