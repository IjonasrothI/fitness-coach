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
}

export interface Meta {
  key: string;
  value: unknown;
}
