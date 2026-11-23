import type {
  AnchorKey, BodyRegion, GoalArea, Level, ParqKey, Profile, Weekday
} from './types';

export const PARQ_QUESTIONS: { key: ParqKey; text: string; hint?: string }[] = [
  { key: 'heartCondition', text: 'Hat dir eine Ärztin oder ein Arzt gesagt, dass du eine Herzerkrankung oder Bluthochdruck hast?' },
  { key: 'chestPain', text: 'Hast du Schmerzen in der Brust – in Ruhe, im Alltag oder bei körperlicher Belastung?' },
  { key: 'dizziness', text: 'Verlierst du durch Schwindel das Gleichgewicht, oder warst du in den letzten 12 Monaten bewusstlos?', hint: 'Schwindel durch schnelles Atmen bei hoher Belastung zählt nicht.' },
  { key: 'chronicCondition', text: 'Wurde bei dir eine andere chronische Erkrankung festgestellt (außer Herz oder Bluthochdruck)?' },
  { key: 'medication', text: 'Nimmst du verschreibungspflichtige Medikamente gegen eine chronische Erkrankung?' },
  { key: 'boneJoint', text: 'Hast du aktuell (oder in den letzten 12 Monaten) ein Knochen-, Gelenk-, Muskel-, Sehnen- oder Bänderproblem, das sich durch mehr Bewegung verschlechtern könnte?', hint: 'Frühere Probleme, die dich heute nicht einschränken, zählen nicht.' },
  { key: 'supervision', text: 'Hat man dir ärztlich gesagt, dass du nur unter medizinischer Aufsicht Sport treiben solltest?' }
];

export const REGION_LABELS: Record<BodyRegion, string> = {
  neck: 'Nacken', shoulder: 'Schulter', elbow: 'Ellbogen', wrist: 'Handgelenk',
  upperBack: 'oberer Rücken', lowerBack: 'unterer Rücken', hip: 'Hüfte',
  knee: 'Knie', ankle: 'Sprunggelenk', achilles: 'Achillessehne', foot: 'Fuß', other: 'Sonstiges'
};

export const GOAL_LABELS: Record<GoalArea, string> = {
  muscle: 'Muskelaufbau',
  strength: 'Kraft im Alltag',
  running: 'Laufen verbessern',
  cycling: 'Radfahren verbessern',
  bodyComposition: 'Körperzusammensetzung / Gewicht',
  mobility: 'Beweglichkeit',
  health: 'Allgemeine Gesundheit'
};

export const LEVEL_LABELS: Record<Level, string> = {
  none: 'Gar nicht',
  some: 'Gelegentlich',
  regular: 'Regelmäßig (≥ 1 Jahr)',
  advanced: 'Fortgeschritten (≥ 3 Jahre)'
};

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  0: 'Mo', 1: 'Di', 2: 'Mi', 3: 'Do', 4: 'Fr', 5: 'Sa', 6: 'So'
};

export const ANCHOR_LABELS: Record<AnchorKey, string> = {
  door: 'Stabile Tür (Band einklemmen)',
  table: 'Stabiler Tisch (darunter rudern)',
  sofa: 'Sofa (Füße einhaken)',
  fixedObject: 'Fester Gegenstand (Pfosten, Heizungsrohr …)',
  stairs: 'Treppe / Stufe',
  chair: 'Stabiler Stuhl / Bank'
};

export function newProfile(): Profile {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: '',
    birthYear: 1990,
    sex: 'male',
    heightCm: 175,
    weightKg: 75,
    health: {
      parq: {
        heartCondition: false, chestPain: false, dizziness: false, chronicCondition: false,
        medication: false, boneJoint: false, supervision: false
      },
      screenedAt: now,
      injuries: [],
      notes: ''
    },
    goals: { focus: 50, areas: ['health'], specificGoal: '', sessionsPerWeek: 4 },
    experience: {
      strength: 'regular', running: 'regular', cycling: 'regular',
      runKmPerWeek: 15, longestRunLast30dKm: 8, cycleHoursPerWeek: 1
    },
    availability: { days: [0, 2, 4, 5], typicalMinutes: 40, allowDoubleSessions: false },
    equipment: {
      dumbbellsKg: [2],
      kettlebellsKg: [5],
      bands: [
        { level: 1, label: 'leicht' },
        { level: 2, label: 'mittel' },
        { level: 3, label: 'stark' },
        { level: 4, label: 'sehr stark' }
      ],
      anchors: { door: true, table: false, sofa: true, fixedObject: true, stairs: false, chair: false }
    },
    endurance: {
      runOutdoor: true, bikeOutdoor: true, bikeIndoor: true, bikeIndoorPower: true
    },
    cycleTrackingConsent: false,
    createdAt: now,
    updatedAt: now
  };
}
