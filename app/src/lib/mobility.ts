// Tagesroutinen (M8): Mobility-Katalog, Animationen, Standard-Morgenroutine und Anpassung an die Tagesform.
// Morgens keine endgradige Lendenwirbel-Beugung (Bandscheiben sind nach dem Schlaf prall gefüllt,
// Snook 1998) – deshalb Hüfte, Brustwirbelsäule, Schultern, Sprunggelenke und Atmung.
import type { Motion, Pose } from './figure';
import type { Light } from './readiness';
import type { Profile, RoutineItem, RoutineKind, RoutineSetup } from './types';

export interface MobilityExercise {
  id: string;
  name: string;
  /** Zielbereich, z. B. „Hüfte" */
  area: string;
  /** eine Zeile, die im Timer steht */
  short: string;
  cues: string[];
  /** pro Seite: Dauer gilt je Seite, dazwischen Seitenwechsel */
  unilateral: boolean;
  defaultSec: number;
}

export const MOBILITY: MobilityExercise[] = [
  {
    id: 'mobAnkleRock', name: 'Sprunggelenk-Wippen', area: 'Sprunggelenk', unilateral: true, defaultSec: 30,
    short: 'Knie sanft über die Zehen schieben',
    cues: ['Halbkniestand, vordere Ferse bleibt am Boden', 'Knie langsam nach vorn über den 2.–3. Zeh, kurz halten, zurück', 'Kein Schmerz, nur Dehnung in der Wade']
  },
  {
    id: 'mobRockBack', name: 'Vierfüßler-Rückwärtswippen', area: 'Hüfte', unilateral: false, defaultSec: 45,
    short: 'Po Richtung Fersen, Rücken lang',
    cues: ['Vierfüßlerstand, Knie etwas breiter als die Hüfte', 'Po langsam Richtung Fersen schieben, Rücken bleibt gerade', 'Nur so weit, wie der Rücken lang bleibt, dann zurück']
  },
  {
    id: 'mobHipFlexor', name: 'Hüftbeuger-Dehnung', area: 'Hüfte vorn', unilateral: true, defaultSec: 30,
    short: 'Po anspannen, Hüfte nach vorn',
    cues: ['Halbkniestand, Kissen unter dem hinteren Knie', 'Po des hinteren Beins anspannen, Becken leicht aufrichten', 'Arm derselben Seite nach oben strecken – Dehnung vorn an der Hüfte']
  },
  {
    id: 'mobWorldsGreatest', name: 'Ausfallschritt mit Rotation', area: 'Hüfte & Brustwirbelsäule', unilateral: true, defaultSec: 30,
    short: 'Hand neben den Fuß, Arm zur Decke',
    cues: ['Großer Ausfallschritt, hinteres Knie bleibt in der Luft oder am Boden', 'Innere Hand neben den vorderen Fuß', 'Anderen Arm zur Decke drehen, Blick folgt der Hand', '3 s halten, Seite nach Ablauf wechseln']
  },
  {
    id: 'mobThoracicRot', name: 'Oberkörper-Rotation im Vierfüßler', area: 'Brustwirbelsäule', unilateral: true, defaultSec: 30,
    short: 'Durchfädeln, dann Arm zur Decke',
    cues: ['Vierfüßlerstand, eine Hand stützt unter der Schulter', 'Freie Hand unter dem Körper durchfädeln, dann weit zur Decke aufdrehen', 'Blick folgt der Hand, Becken bleibt ruhig']
  },
  {
    id: 'mobBandDislocate', name: 'Schulterkreisen mit Band', area: 'Schultern', unilateral: false, defaultSec: 45,
    short: 'Gestreckte Arme über den Kopf nach hinten',
    cues: ['Band sehr breit greifen, Arme gestreckt', 'Langsam über den Kopf nach hinten und wieder nach vorn führen', 'Wird es eng: Griff breiter machen statt Ellbogen beugen']
  },
  {
    id: 'mobDeepSquat', name: 'Tiefe Hocke mit Halt', area: 'Hüfte & Sprunggelenk', unilateral: false, defaultSec: 45,
    short: 'Tief sitzen, sanft wippen',
    cues: ['An Sofa, Türrahmen oder Tischbein festhalten', 'So tief wie angenehm, Fersen möglichst am Boden', 'Sanft hin und her wippen, ruhig atmen']
  },
  {
    id: 'mobBreathing', name: 'Ruhige Atmung', area: 'Atmung', unilateral: false, defaultSec: 60,
    short: '4 s ein · 6 s aus',
    cues: ['Rückenlage, Füße aufgestellt, Hände auf den Bauch', 'Durch die Nase einatmen, der Bauch hebt sich', 'Langsam länger ausatmen als einatmen']
  },
  {
    id: 'mobCatCow', name: 'Katze-Kuh (sanft)', area: 'Wirbelsäule', unilateral: false, defaultSec: 45,
    short: 'Langsam, nicht bis zum Anschlag',
    cues: ['Vierfüßlerstand, Hände unter den Schultern', 'Rücken abwechselnd sanft runden und strecken', 'Morgens nur im angenehmen Mittelbereich bewegen']
  },
  {
    id: 'mobBirdDog', name: 'Vierfüßler diagonal', area: 'Rumpf & Hüfte', unilateral: false, defaultSec: 45,
    short: 'Arm und Gegenbein lang machen',
    cues: ['Vierfüßlerstand, Rücken gerade wie ein Tisch', 'Einen Arm und das gegenüberliegende Bein lang strecken, 2 s halten', 'Seiten abwechseln, Becken bleibt waagerecht']
  },
  {
    id: 'mobLegSwings', name: 'Beinschwingen', area: 'Hüfte', unilateral: true, defaultSec: 30,
    short: 'Locker vor und zurück schwingen',
    cues: ['Seitlich an der Wand festhalten', 'Bein locker vor und zurück schwingen, langsam größer werden', 'Oberkörper bleibt aufrecht']
  },
  {
    id: 'mobWallSlide', name: 'Arme hochschieben (W zu Y)', area: 'Schultern & oberer Rücken', unilateral: false, defaultSec: 45,
    short: 'Von W zu Y, Schultern tief',
    cues: ['Rücken und Hinterkopf an die Wand', 'Arme als „W" anlegen, dann langsam zum „Y" nach oben schieben', 'Schultern bleiben weg von den Ohren']
  },
  {
    id: 'mobCalfStretch', name: 'Wadendehnung an der Wand', area: 'Wade', unilateral: true, defaultSec: 30,
    short: 'Hintere Ferse bleibt unten',
    cues: ['Hände an die Wand, ein Bein weit nach hinten', 'Hinteres Bein gestreckt, Ferse am Boden', 'Hüfte langsam Richtung Wand schieben']
  },
  {
    id: 'mobArmCircles', name: 'Armkreisen', area: 'Schultern', unilateral: false, defaultSec: 30,
    short: 'Große, ruhige Kreise',
    cues: ['Aufrecht stehen, Arme locker gestreckt', 'Große Kreise, Richtung nach der Hälfte wechseln']
  },
  {
    id: 'mobSideBend', name: 'Seitneigung im Stand', area: 'Flanke', unilateral: false, defaultSec: 30,
    short: 'Arme hoch, sanft zur Seite',
    cues: ['Füße hüftbreit, Arme über den Kopf', 'Langsam zu einer Seite neigen, Becken bleibt mittig', 'Seiten abwechseln']
  }
];

export const MOBILITY_BY_ID: Record<string, MobilityExercise> = Object.fromEntries(MOBILITY.map((m) => [m.id, m]));

export const ROUTINE_LABELS: Record<RoutineKind, string> = { morning: 'Morgenroutine', evening: 'Abendroutine' };

const item = (id: string): RoutineItem => ({ id, sec: MOBILITY_BY_ID[id]!.defaultSec });

/** Standard: 8 Übungen, rund 9 Minuten, von unten nach oben, Atmung zum Schluss. */
export const DEFAULT_MORNING: RoutineItem[] = [
  'mobAnkleRock', 'mobRockBack', 'mobHipFlexor', 'mobWorldsGreatest',
  'mobThoracicRot', 'mobBandDislocate', 'mobDeepSquat', 'mobBreathing'
].map(item);

export function routineSetup(p: Profile, kind: RoutineKind): RoutineSetup {
  const s = p.routines?.[kind];
  if (s) return { ...s, items: s.items.filter((x) => MOBILITY_BY_ID[x.id]) };
  return { items: kind === 'morning' ? DEFAULT_MORNING.map((x) => ({ ...x })) : [], autoStart: true };
}

/** Vorlauf vor jeder Übung (Position einnehmen) und Seitenwechsel – wie im Player. */
export const COUNT_IN_SEC = 6;
export const SWITCH_SEC = 5;

export function itemSeconds(it: RoutineItem): number {
  const ex = MOBILITY_BY_ID[it.id];
  if (!ex) return 0;
  return COUNT_IN_SEC + (ex.unilateral ? it.sec * 2 + SWITCH_SEC : it.sec);
}

export function routineSeconds(items: RoutineItem[]): number {
  return items.reduce((a, x) => a + itemSeconds(x), 0);
}

export function routineMinutesLabel(items: RoutineItem[]): string {
  const m = Math.max(1, Math.round(routineSeconds(items) / 60));
  return `${m} ${m === 1 ? 'Minute' : 'Minuten'}`;
}

export const GENTLE_FACTOR = 0.65;

/**
 * Tagesform → Routine: Grün/Gelb normal, Rot oder krank sanfter (kürzere Haltezeiten),
 * Warnzeichen → keine Routine. Übungen und Reihenfolge bleiben immer gleich.
 */
export function routineForToday(
  items: RoutineItem[],
  day: { light: Light; hardStop: boolean; noTraining: boolean } | null
): { items: RoutineItem[]; gentle: boolean; blocked: boolean; autoStartOk: boolean } {
  if (day?.hardStop) return { items: [], gentle: false, blocked: true, autoStartOk: false };
  const gentle = !!day && (day.light === 'red' || day.noTraining);
  const out = gentle ? items.map((x) => ({ ...x, sec: Math.max(15, Math.round((x.sec * GENTLE_FACTOR) / 5) * 5) })) : items;
  return { items: out, gentle, blocked: false, autoStartOk: !day?.noTraining };
}

// ---------- Animationen ----------

type V = [number, number];
const KNEEL_BACK = { to: [-23, -1] as V, bend: 'down' as const, foot: -95 };
const QUAD_LEG: [number, number, number] = [0, -90, -95];
const QUAD = { hip: [0, -24] as V, t: 104 };
const SUPPORT = { to: [31, -1] as V, bend: 'fwd' as const };
const STAND_LEGS = { ln: { to: [2, -3] as V }, lf: { to: [-1, -3] as V } };

const ankleRock = (): Motion => ({
  frames: [
    { hip: [0, -25], t: 178, an: [55, 100], ln: { to: [21, -3] }, lf: KNEEL_BACK },
    { hip: [7, -24], t: 172, an: [60, 105], ln: { to: [21, -3] }, lf: KNEEL_BACK }
  ],
  dur: [1.5, 1.5], hold: [0.4, 1], props: [{ k: 'cushion', x: -1 }], tempo: 'langsam vor · kurz halten'
});

const rockBack = (): Motion => ({
  frames: [
    { ...QUAD, an: SUPPORT, ln: QUAD_LEG },
    { hip: [-14, -19.5], t: 100, h: -15, an: SUPPORT, ln: [35.7, -90, -95] }
  ],
  dur: [2.5, 2], hold: [0.4, 1.2], tempo: 'langsam zurück · Rücken bleibt lang'
});

const hipFlexor = (): Motion => ({
  frames: [
    { hip: [0, -25], t: 180, an: [40, 60], af: [20, 20], ln: { to: [24, -3] }, lf: KNEEL_BACK },
    { hip: [6, -24], t: 184, an: [40, 60], af: [178, 178], ln: { to: [24, -3] }, lf: KNEEL_BACK }
  ],
  dur: [2, 1.5], hold: [0.5, 3], props: [{ k: 'cushion', x: -1 }], tempo: 'Po fest · 3 s halten'
});

const worldsGreatest = (): Motion => {
  const legs = { ln: { to: [26, -3] as V }, lf: { to: [-40, -4] as V, bend: 'down' as const, foot: -60 } };
  return {
    frames: [
      { hip: [0, -22], t: 120, h: -20, an: { to: [22, -1], bend: 'back' }, af: { to: [22, -1], bend: 'back' }, ...legs },
      { hip: [0, -22], t: 125, h: 40, an: [178, 178], af: { to: [22, -1], bend: 'back' }, ...legs }
    ],
    dur: [2, 1.5], hold: [0.6, 2.5], tempo: 'aufdrehen · 3 s halten'
  };
};

const thoracicRot = (): Motion => ({
  frames: [
    { ...QUAD, h: -40, an: [-10, -60], af: SUPPORT, ln: QUAD_LEG },
    { ...QUAD, h: 50, an: [178, 178], af: SUPPORT, ln: QUAD_LEG }
  ],
  dur: [2, 2], hold: [0.5, 1.2], tempo: 'langsam auf · 1 s halten'
});

const bandDislocate = (): Motion => ({
  frames: [
    { hip: [0, -49], t: 180, an: [25, 25], ...STAND_LEGS },
    { hip: [0, -49], t: 180, an: [180, 180], ...STAND_LEGS },
    { hip: [0, -49], t: 180, an: [-150, -150], ...STAND_LEGS },
    { hip: [0, -49], t: 180, an: [180, 180], ...STAND_LEGS }
  ],
  dur: [2, 1.2, 1.2, 2], hold: [0.3, 0, 0.4, 0], tempo: 'Arme gestreckt · langsam',
  props: [{ k: 'band', a: 'handN', b: 'handF' }]
});

const deepSquat = (): Motion => ({
  frames: [
    { hip: [-10, -14], t: 150, an: { to: [31, -38], bend: 'down' }, ...STAND_LEGS },
    { hip: [-7, -16], t: 158, an: { to: [31, -38], bend: 'down' }, ...STAND_LEGS }
  ],
  dur: [2, 2], hold: [1, 1], props: [{ k: 'post', x: 31, h: 60 }], tempo: 'sanft wippen'
});

const breathing = (): Motion => {
  const legs = { ln: { to: [24, -3] as V, bend: 'up' as const } };
  return {
    frames: [
      { hip: [0, -6], t: -90, h: 0, an: { to: [-12, -13], bend: 'up' }, ...legs },
      { hip: [0, -6], t: -90, h: 0, an: { to: [-12, -16.5], bend: 'up' }, ...legs }
    ],
    dur: [4, 6], tempo: '4 s ein · 6 s aus'
  };
};

const catCow = (): Motion => ({
  frames: [
    { ...QUAD, t: 108, h: 35, an: SUPPORT, ln: QUAD_LEG },
    { hip: [0, -25], t: 98, h: -45, an: SUPPORT, ln: QUAD_LEG }
  ],
  dur: [2.5, 2.5], hold: [0.5, 0.5], tempo: 'langsam · im angenehmen Bereich'
});

const birdDog = (): Motion => {
  const base: Pose = { ...QUAD, an: SUPPORT, af: SUPPORT, ln: QUAD_LEG, lf: QUAD_LEG };
  return {
    frames: [
      base,
      { ...base, an: [92, 92], lf: [-88, -88, -60] },
      base,
      { ...base, af: [92, 92], ln: [-88, -88, -60] }
    ],
    dur: [1.5, 1.5, 1.5, 1.5], hold: [0.3, 2, 0.3, 2], tempo: 'lang machen · 2 s halten'
  };
};

const legSwings = (): Motion => {
  const base = { hip: [0, -49] as V, t: 180, an: { to: [28, -70] as V, bend: 'down' as const }, lf: { to: [-1, -3] as V } };
  return {
    frames: [
      { ...base, ln: [55, 45, 100] },
      { ...base, ln: [-30, -20, 60] }
    ],
    dur: [0.9, 0.9], props: [{ k: 'wall', x: 30 }], tempo: 'locker schwingen'
  };
};

const wallSlide = (): Motion => ({
  front: true,
  frames: [
    { hip: [0, -49], t: 180, an: [125, 178], ln: { to: [7, -3] } },
    { hip: [0, -49], t: 180, an: [158, 162], ln: { to: [7, -3] } }
  ],
  dur: [2.5, 2], hold: [0.5, 0.5], tempo: '2–3 s hoch · langsam zurück'
});

const calfStretch = (): Motion => {
  const legs = { ln: { to: [12, -3] as V }, lf: { to: [-30, -3] as V, bend: 'fwd' as const } };
  return {
    frames: [
      { hip: [-8, -46], t: 162, an: { to: [28, -72], bend: 'down' }, ...legs },
      { hip: [-2, -44], t: 155, an: { to: [28, -72], bend: 'down' }, ...legs }
    ],
    dur: [2, 1.5], hold: [0.5, 3], props: [{ k: 'wall', x: 30 }], tempo: 'Ferse unten · 3 s halten'
  };
};

const armCircles = (): Motion => ({
  frames: [0, 90, 180, -90].map((a): Pose => ({ hip: [0, -49], t: 180, an: [a, a], af: [a + 8, a + 8], ...STAND_LEGS })),
  dur: [0.8, 0.8, 0.8, 0.8], tempo: 'große Kreise'
});

const sideBend = (): Motion => ({
  front: true,
  frames: [
    { hip: [0, -49], t: 166, an: [150, 160], af: [-178, -178], ln: { to: [7, -3] } },
    { hip: [0, -49], t: 194, an: [178, 178], af: [-150, -160], ln: { to: [7, -3] } }
  ],
  dur: [2, 2], hold: [1.5, 1.5], tempo: 'langsam · 2 s halten'
});

export const MOBILITY_MOTIONS: Record<string, Motion> = {
  mobAnkleRock: ankleRock(),
  mobRockBack: rockBack(),
  mobHipFlexor: hipFlexor(),
  mobWorldsGreatest: worldsGreatest(),
  mobThoracicRot: thoracicRot(),
  mobBandDislocate: bandDislocate(),
  mobDeepSquat: deepSquat(),
  mobBreathing: breathing(),
  mobCatCow: catCow(),
  mobBirdDog: birdDog(),
  mobLegSwings: legSwings(),
  mobWallSlide: wallSlide(),
  mobCalfStretch: calfStretch(),
  mobArmCircles: armCircles(),
  mobSideBend: sideBend()
};
