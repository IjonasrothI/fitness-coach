// Übungskatalog mit Variantenleitern (leicht → schwer) je Bewegungsmuster.
// Equipment: Kurzhanteln ≤ 2 kg, Kettlebell 5 kg, geschlossene Bänder (Stufen), Sofa, feste Gegenstände.
// Leitern und Reihenfolge sind Expertenmeinung (Evidenz C/D, siehe K11, K13, K17).
import type { AnchorKey, Exercise, Muscle, PatternId } from './types';

const BAND_ANCHOR: AnchorKey[] = ['fixedObject', 'door'];

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Brust', shoulders: 'Schultern', triceps: 'Trizeps', upperBack: 'Oberer Rücken',
  lats: 'Latissimus', biceps: 'Bizeps', quads: 'Oberschenkel vorn', glutes: 'Gesäß',
  hamstrings: 'Oberschenkel hinten', calves: 'Waden', core: 'Rumpf'
};

export interface PatternInfo {
  id: PatternId;
  name: string;
  /** Grundübung (zuerst) oder Ergänzung */
  compound: boolean;
  /** Reihenfolge in der Einheit (K16) */
  order: number;
  /** Gruppe für die Einstufung */
  half: 'lower' | 'upper';
}

export const PATTERNS: PatternInfo[] = [
  { id: 'squat', name: 'Kniebeuge-Muster', compound: true, order: 1, half: 'lower' },
  { id: 'hamstring', name: 'Hintere Oberschenkel', compound: true, order: 2, half: 'lower' },
  { id: 'hinge', name: 'Hüftstreckung', compound: true, order: 3, half: 'lower' },
  { id: 'hPush', name: 'Drücken horizontal', compound: true, order: 4, half: 'upper' },
  { id: 'hPull', name: 'Ziehen horizontal', compound: true, order: 5, half: 'upper' },
  { id: 'vPush', name: 'Drücken über Kopf', compound: true, order: 6, half: 'upper' },
  { id: 'vPull', name: 'Ziehen von oben', compound: true, order: 7, half: 'upper' },
  { id: 'lateral', name: 'Seitliche Schulter', compound: false, order: 8, half: 'upper' },
  { id: 'triceps', name: 'Trizeps', compound: false, order: 9, half: 'upper' },
  { id: 'biceps', name: 'Bizeps', compound: false, order: 10, half: 'upper' },
  { id: 'calves', name: 'Waden', compound: false, order: 11, half: 'lower' },
  { id: 'core', name: 'Rumpf', compound: false, order: 12, half: 'lower' }
];

export const PATTERN_BY_ID = Object.fromEntries(PATTERNS.map((p) => [p.id, p])) as Record<PatternId, PatternInfo>;

/** Reihenfolge in jedem Muster = Leiter von leicht nach schwer */
export const EXERCISES: Exercise[] = [
  // ---------- Kniebeuge-Muster ----------
  {
    id: 'gobletSquat', name: 'Goblet Squat (Kettlebell)', pattern: 'squat',
    muscles: { quads: 1, glutes: 0.5 }, requires: { kettlebell: true }, regions: ['knee', 'hip'],
    safeToFailure: true, repWindow: [10, 25],
    cues: ['Kettlebell vor der Brust halten', '3 s runter, so tief es sauber geht', 'Knie zeigen in Richtung Zehen']
  },
  {
    id: 'splitSquat', name: 'Split Squat', pattern: 'squat',
    muscles: { quads: 1, glutes: 0.5 }, unilateral: true, regions: ['knee', 'hip'], safeToFailure: true,
    heavyLegs: true, repWindow: [8, 20],
    cues: ['Großer Ausfallschritt, Füße hüftbreit', 'Hinteres Knie fast bis zum Boden', 'Optional Kettlebell in der Hand']
  },
  {
    id: 'bulgarian', name: 'Bulgarian Split Squat (hinterer Fuß auf Sofa)', pattern: 'squat',
    muscles: { quads: 1, glutes: 0.5 }, unilateral: true, requires: { anchorsAny: ['sofa', 'chair'] },
    regions: ['knee', 'hip'], safeToFailure: true, heavyLegs: true, repWindow: [8, 20],
    cues: ['Hinterer Fußrist auf der Sofakante', 'Tief in die Dehnung absenken (vorderer Oberschenkel)', 'Kettlebell in der Hand auf der Seite des hinteren Beins']
  },
  {
    id: 'bulgarianDeficit', name: 'Bulgarian Split Squat mit Defizit', pattern: 'squat',
    muscles: { quads: 1, glutes: 0.5 }, unilateral: true, requires: { anchorsAny: ['sofa', 'chair'] },
    regions: ['knee', 'hip'], safeToFailure: true, heavyLegs: true, repWindow: [6, 15],
    cues: ['Vorderer Fuß auf einem dicken Buch oder einer Stufe', 'Dadurch tiefere Dehnung – langsam absenken', 'Kettlebell in der Hand']
  },
  {
    id: 'skaterSquat', name: 'Skater Squat', pattern: 'squat',
    muscles: { quads: 1, glutes: 0.5 }, unilateral: true, regions: ['knee', 'hip'], safeToFailure: false,
    heavyLegs: true, skill: true, repWindow: [6, 15],
    cues: ['Auf einem Bein, hinteres Knie Richtung Boden', 'Kissen als Ziel unter das Knie legen', 'Arme nach vorne als Gegengewicht']
  },
  {
    id: 'pistolBox', name: 'Pistol Squat auf Sofa', pattern: 'squat',
    muscles: { quads: 1, glutes: 0.5 }, unilateral: true, requires: { anchorsAny: ['sofa', 'chair'] },
    regions: ['knee', 'hip', 'ankle'], safeToFailure: false, heavyLegs: true, skill: true, repWindow: [6, 15],
    cues: ['Einbeinig auf die Sofakante absenken, kurz antippen', 'Ohne Schwung wieder aufstehen', 'Freies Bein nach vorne']
  },
  {
    id: 'pistol', name: 'Pistol Squat', pattern: 'squat',
    muscles: { quads: 1, glutes: 0.5 }, unilateral: true, regions: ['knee', 'hip', 'ankle'],
    safeToFailure: false, heavyLegs: true, skill: true, repWindow: [5, 12],
    cues: ['Volle Tiefe auf einem Bein', 'Ferse bleibt am Boden', 'Wenn leicht: Kettlebell vor der Brust']
  },

  // ---------- Hintere Oberschenkel ----------
  {
    id: 'slRdl', name: 'Einbeiniges Rumänisches Kreuzheben (KB)', pattern: 'hamstring',
    muscles: { hamstrings: 1, glutes: 0.5 }, unilateral: true, requires: { kettlebell: true },
    regions: ['lowerBack', 'hip'], safeToFailure: true, repWindow: [10, 20],
    cues: ['Rücken gerade, Hüfte nach hinten schieben', 'Bis zur deutlichen Dehnung hinten im Oberschenkel', '2 s Pause unten in der Dehnung']
  },
  {
    id: 'slidingCurl', name: 'Gleitender Beinbeuger (Handtuch, beidbeinig)', pattern: 'hamstring',
    muscles: { hamstrings: 1, glutes: 0.5 }, regions: ['knee', 'lowerBack'], safeToFailure: true, repWindow: [8, 20],
    cues: ['Rückenlage, Fersen auf Handtuch (glatter Boden) oder Socken', 'Hüfte hoch halten', 'Beine langsam ausstrecken, kraftvoll heranziehen']
  },
  {
    id: 'slidingCurlSl', name: 'Gleitender Beinbeuger einbeinig', pattern: 'hamstring',
    muscles: { hamstrings: 1, glutes: 0.5 }, unilateral: true, regions: ['knee', 'lowerBack'], safeToFailure: true,
    repWindow: [6, 15],
    cues: ['Wie beidbeinig, aber nur ein Bein arbeitet', 'Hüfte bleibt waagerecht', 'Ausstrecken 3 s']
  },
  {
    id: 'nordicNeg', name: 'Nordic Curl – nur absenken (Füße unters Sofa)', pattern: 'hamstring',
    muscles: { hamstrings: 1 }, requires: { anchorsAny: ['sofa'] }, regions: ['knee'],
    safeToFailure: false, skill: true, repWindow: [3, 8],
    cues: ['Knien auf Kissen, Fersen unter dem Sofa einhaken', 'Körper gerade, so langsam wie möglich nach vorne kippen', 'Mit den Händen abfangen, mit Händen zurückdrücken', 'Anfangs nur 1–2 Sätze: starker Muskelkater möglich (K20)']
  },
  {
    id: 'nordic', name: 'Nordic Curl', pattern: 'hamstring',
    muscles: { hamstrings: 1 }, requires: { anchorsAny: ['sofa'] }, regions: ['knee'],
    safeToFailure: false, skill: true, repWindow: [3, 10],
    cues: ['Absenken und aus eigener Kraft wieder hochkommen', 'Hüfte bleibt gestreckt']
  },

  // ---------- Hüftstreckung ----------
  {
    id: 'gluteBridge', name: 'Glute Bridge (KB auf der Hüfte)', pattern: 'hinge',
    muscles: { glutes: 1, hamstrings: 0.5 }, requires: { kettlebell: true }, regions: ['lowerBack'],
    safeToFailure: true, repWindow: [12, 25],
    cues: ['Rückenlage, Füße nah am Gesäß', 'Oben 1 s Gesäß fest anspannen', 'Rippen unten lassen, nicht ins Hohlkreuz']
  },
  {
    id: 'hipThrust', name: 'Hip Thrust (Schultern auf Sofa, KB)', pattern: 'hinge',
    muscles: { glutes: 1, hamstrings: 0.5 }, requires: { anchorsAny: ['sofa', 'chair'], kettlebell: true },
    regions: ['lowerBack', 'hip'], safeToFailure: true, repWindow: [12, 25],
    cues: ['Oberer Rücken an der Sofakante', 'Volle Bewegung: tief runter, oben 1 s halten', 'Kinn Richtung Brust']
  },
  {
    id: 'hipThrustSl', name: 'Einbeiniger Hip Thrust (Sofa)', pattern: 'hinge',
    muscles: { glutes: 1, hamstrings: 0.5 }, unilateral: true, requires: { anchorsAny: ['sofa', 'chair'] },
    regions: ['lowerBack', 'hip'], safeToFailure: true, repWindow: [8, 20],
    cues: ['Ein Fuß am Boden, anderes Bein angewinkelt', 'Becken bleibt waagerecht', 'Optional KB auf der Hüfte']
  },
  {
    id: 'hipThrustSlBand', name: 'Einbeiniger Hip Thrust + Band', pattern: 'hinge',
    muscles: { glutes: 1, hamstrings: 0.5 }, unilateral: true, band: true,
    requires: { anchorsAny: ['sofa', 'chair'] }, regions: ['lowerBack', 'hip'], safeToFailure: true, repWindow: [8, 20],
    cues: ['Band über die Hüfte, Enden unter den Händen/Füßen fixieren', 'Oben 2 s halten']
  },

  // ---------- Drücken horizontal ----------
  {
    id: 'pushupIncline', name: 'Liegestütz erhöht (Hände auf Sofa)', pattern: 'hPush',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 }, requires: { anchorsAny: ['sofa', 'chair'] },
    regions: ['wrist', 'shoulder', 'elbow'], safeToFailure: true, repWindow: [10, 25],
    cues: ['Körper wie ein Brett', 'Brust bis an die Kante', 'Ellbogen ca. 45° vom Körper']
  },
  {
    id: 'pushup', name: 'Liegestütz', pattern: 'hPush',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 }, regions: ['wrist', 'shoulder', 'elbow'],
    safeToFailure: true, repWindow: [8, 25],
    cues: ['Körperspannung, Gesäß fest', 'Brust fast bis zum Boden', '2 s runter, zügig hoch']
  },
  {
    id: 'pushupDeficit', name: 'Defizit-Liegestütz (Hände auf Hanteln)', pattern: 'hPush',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 }, requires: { dumbbell: true },
    regions: ['wrist', 'shoulder', 'elbow'], safeToFailure: true, repWindow: [8, 25],
    cues: ['Hände auf den Hanteln (oder Bücher)', 'Brust tiefer als die Hände – mehr Dehnung (K13)', 'Unten 1 s halten']
  },
  {
    id: 'pushupBand', name: 'Defizit-Liegestütz mit Band', pattern: 'hPush',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 }, band: true, requires: { dumbbell: true },
    regions: ['wrist', 'shoulder', 'elbow'], safeToFailure: true, repWindow: [8, 20],
    cues: ['Band über den oberen Rücken, Enden unter den Händen', 'Sonst wie Defizit-Liegestütz']
  },
  {
    id: 'archer', name: 'Archer-Liegestütz', pattern: 'hPush',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 }, unilateral: true, regions: ['wrist', 'shoulder', 'elbow'],
    safeToFailure: false, skill: true, repWindow: [5, 15],
    cues: ['Sehr breite Hände, Gewicht auf eine Seite verlagern', 'Anderer Arm bleibt fast gestreckt', 'Seiten abwechseln']
  },
  {
    id: 'oneArmNeg', name: 'Einarmiger Liegestütz – absenken', pattern: 'hPush',
    muscles: { chest: 1, triceps: 0.5, shoulders: 0.5 }, unilateral: true, regions: ['wrist', 'shoulder', 'elbow'],
    safeToFailure: false, skill: true, repWindow: [3, 8],
    cues: ['Breite Fußstellung, ein Arm hinter dem Rücken', '3–5 s absenken, mit beiden Händen hochdrücken']
  },

  // ---------- Ziehen horizontal ----------
  {
    id: 'bandRowSeated', name: 'Rudern sitzend mit Band (um die Füße)', pattern: 'hPull',
    muscles: { upperBack: 1, lats: 0.5, biceps: 0.5 }, band: true, regions: ['lowerBack', 'shoulder'],
    safeToFailure: true, repWindow: [12, 25],
    cues: ['Sitzen, Beine gestreckt, Band um die Fußsohlen', 'Ellbogen nah am Körper nach hinten', 'Schulterblätter zusammen, vorne voll strecken lassen']
  },
  {
    id: 'bandRowSa', name: 'Einarmiges Rudern mit Band (verankert)', pattern: 'hPull',
    muscles: { upperBack: 1, lats: 0.5, biceps: 0.5 }, band: true, unilateral: true,
    requires: { anchorsAny: BAND_ANCHOR }, regions: ['shoulder'], safeToFailure: true, repWindow: [10, 25],
    cues: ['Band an festem Gegenstand auf Brusthöhe', 'Weiter weg stellen = mehr Vorspannung', 'Vorne Schulter nach vorne ziehen lassen (Dehnung), dann kraftvoll rudern']
  },
  {
    id: 'tableRow', name: 'Tisch-Rudern (unter stabilem Tisch)', pattern: 'hPull',
    muscles: { upperBack: 1, lats: 0.5, biceps: 0.5 }, requires: { anchorsAny: ['table'] },
    regions: ['shoulder', 'elbow'], safeToFailure: true, repWindow: [6, 20],
    cues: ['Nur wenn der Tisch absolut kippsicher ist!', 'Unter den Tisch legen, Tischkante greifen', 'Brust zur Kante ziehen, Körper gerade']
  },
  {
    id: 'bandRowSaPause', name: 'Einarmiges Band-Rudern mit Pause hinten', pattern: 'hPull',
    muscles: { upperBack: 1, lats: 0.5, biceps: 0.5 }, band: true, unilateral: true,
    requires: { anchorsAny: BAND_ANCHOR }, regions: ['shoulder'], safeToFailure: true, repWindow: [8, 20],
    cues: ['Wie einarmiges Rudern', '2 s Pause in der Endposition', 'Doppelt gelegtes Band für mehr Widerstand']
  },

  // ---------- Drücken über Kopf ----------
  {
    id: 'bandPress', name: 'Schulterdrücken mit Band (stehend)', pattern: 'vPush',
    muscles: { shoulders: 1, triceps: 0.5 }, band: true, regions: ['shoulder', 'elbow'],
    safeToFailure: true, repWindow: [10, 25],
    cues: ['Auf das Band stellen, Enden auf Schulterhöhe', 'Gerade über den Kopf drücken', 'Bauch fest, kein Hohlkreuz']
  },
  {
    id: 'pike', name: 'Pike-Liegestütz', pattern: 'vPush',
    muscles: { shoulders: 1, triceps: 0.5 }, regions: ['shoulder', 'wrist', 'elbow'], safeToFailure: true,
    repWindow: [6, 20],
    cues: ['Hüfte hoch, Körper als umgedrehtes V', 'Kopf vor die Hände Richtung Boden', 'Ellbogen nicht ganz nach außen']
  },
  {
    id: 'pikeElevated', name: 'Pike-Liegestütz, Füße auf Sofa', pattern: 'vPush',
    muscles: { shoulders: 1, triceps: 0.5 }, requires: { anchorsAny: ['sofa', 'chair'] },
    regions: ['shoulder', 'wrist', 'elbow'], safeToFailure: false, skill: true, repWindow: [5, 15],
    cues: ['Füße auf dem Sofa, Hüfte über den Schultern', 'Kontrolliert absenken']
  },
  {
    id: 'wallHspuNeg', name: 'Handstand-Liegestütz an der Wand – absenken', pattern: 'vPush',
    muscles: { shoulders: 1, triceps: 0.5 }, regions: ['shoulder', 'wrist', 'elbow', 'neck'],
    safeToFailure: false, skill: true, repWindow: [3, 8],
    cues: ['Nur wenn Handstand an der Wand sicher klappt', '3–5 s absenken, Kopf auf Kissen', 'Mit den Füßen von der Wand abrollen zum Aufstehen']
  },

  // ---------- Ziehen von oben ----------
  {
    id: 'bandPulldown', name: 'Latziehen mit Band (kniend, Band oben verankert)', pattern: 'vPull',
    muscles: { lats: 1, biceps: 0.5, upperBack: 0.5 }, band: true, requires: { anchorsAny: BAND_ANCHOR },
    regions: ['shoulder'], safeToFailure: true, repWindow: [12, 25],
    cues: ['Band hoch verankern (z. B. oben in der Tür eingeklemmt oder fester Pfosten)', 'Arme oben ganz strecken (Dehnung)', 'Ellbogen zur Hüfte ziehen']
  },
  {
    id: 'bandPulldownSa', name: 'Einarmiges Latziehen mit Band', pattern: 'vPull',
    muscles: { lats: 1, biceps: 0.5, upperBack: 0.5 }, band: true, unilateral: true,
    requires: { anchorsAny: BAND_ANCHOR }, regions: ['shoulder'], safeToFailure: true, repWindow: [10, 25],
    cues: ['Eine Hand, Ellbogen an der Seite vorbei nach unten', 'Oben die Seite lang werden lassen']
  },
  {
    id: 'bandPulldownSaPartials', name: 'Einarmiges Latziehen + gedehnte Teilwdh.', pattern: 'vPull',
    muscles: { lats: 1, biceps: 0.5, upperBack: 0.5 }, band: true, unilateral: true,
    requires: { anchorsAny: BAND_ANCHOR }, regions: ['shoulder'], safeToFailure: true, repWindow: [10, 25],
    cues: ['Volle Wiederholungen bis kurz vor Versagen', 'Dann halbe Wiederholungen nur im oberen, gedehnten Bereich weiter (K11)']
  },

  // ---------- Seitliche Schulter ----------
  {
    id: 'latRaiseDb', name: 'Seitheben mit Kurzhanteln', pattern: 'lateral',
    muscles: { shoulders: 1 }, requires: { dumbbell: true }, regions: ['shoulder'], safeToFailure: true,
    repWindow: [12, 30],
    cues: ['Leicht vorgebeugt, Arme leicht gebeugt', 'Bis Schulterhöhe heben, 2 s absenken']
  },
  {
    id: 'latRaiseBand', name: 'Seitheben mit Band (einarmig)', pattern: 'lateral',
    muscles: { shoulders: 1 }, band: true, unilateral: true, regions: ['shoulder'], safeToFailure: true,
    repWindow: [12, 25],
    cues: ['Band unter den gegenüberliegenden Fuß (Band kreuzt vor dem Körper)', 'Seitlich bis Schulterhöhe']
  },

  // ---------- Trizeps ----------
  {
    id: 'diamondPushup', name: 'Enger Liegestütz', pattern: 'triceps',
    muscles: { triceps: 1, chest: 0.5 }, regions: ['wrist', 'elbow'], safeToFailure: true, repWindow: [8, 25],
    cues: ['Hände schulterbreit oder enger', 'Ellbogen nah am Körper']
  },
  {
    id: 'bandOverheadExt', name: 'Trizepsdrücken über Kopf mit Band', pattern: 'triceps',
    muscles: { triceps: 1 }, band: true, regions: ['elbow', 'shoulder'], safeToFailure: true, repWindow: [12, 25],
    cues: ['Band unter den Fuß (Ausfallschritt) oder hinten verankert', 'Ellbogen zeigen nach vorne-oben', 'Tief hinter den Kopf in die Dehnung (K13)']
  },

  // ---------- Bizeps ----------
  {
    id: 'bandCurl', name: 'Bizeps-Curl mit Band', pattern: 'biceps',
    muscles: { biceps: 1 }, band: true, regions: ['elbow'], safeToFailure: true, repWindow: [12, 25],
    cues: ['Auf das Band stellen', 'Ellbogen bleiben an der Seite', 'Unten ganz strecken']
  },
  {
    id: 'bandCurlBehind', name: 'Bizeps-Curl mit Band, Arm hinter dem Körper', pattern: 'biceps',
    muscles: { biceps: 1 }, band: true, unilateral: true, requires: { anchorsAny: BAND_ANCHOR },
    regions: ['elbow', 'shoulder'], safeToFailure: true, repWindow: [10, 25],
    cues: ['Band tief hinter dir verankert, Rücken zum Anker', 'Arm startet hinter dem Körper – starke Dehnung (K13)']
  },

  // ---------- Waden ----------
  {
    id: 'calfRaise', name: 'Wadenheben beidbeinig (Stufe)', pattern: 'calves',
    muscles: { calves: 1 }, regions: ['achilles', 'ankle', 'foot'], safeToFailure: true, repWindow: [12, 30],
    cues: ['Vorfüße auf Stufe oder dickem Buch', 'Unten 2 s in der Dehnung halten', 'Ganz hoch auf die Zehen']
  },
  {
    id: 'calfRaiseSl', name: 'Wadenheben einbeinig (Stufe)', pattern: 'calves',
    muscles: { calves: 1 }, unilateral: true, regions: ['achilles', 'ankle', 'foot'], safeToFailure: true,
    repWindow: [8, 25],
    cues: ['Leicht an der Wand festhalten', '2 s Pause unten in der Dehnung']
  },
  {
    id: 'calfRaiseSlKb', name: 'Wadenheben einbeinig mit Kettlebell', pattern: 'calves',
    muscles: { calves: 1 }, unilateral: true, requires: { kettlebell: true }, regions: ['achilles', 'ankle', 'foot'],
    safeToFailure: true, repWindow: [8, 20],
    cues: ['KB auf der Seite des Standbeins', '2 s Pause unten']
  },

  // ---------- Rumpf ----------
  {
    id: 'deadBug', name: 'Dead Bug', pattern: 'core',
    muscles: { core: 1 }, regions: ['lowerBack'], safeToFailure: true, repWindow: [10, 25],
    cues: ['Lendenwirbelsäule bleibt am Boden', 'Arm und Gegenbein langsam strecken', 'Wdh. pro Seite zählen']
  },
  {
    id: 'reverseCrunch', name: 'Reverse Crunch', pattern: 'core',
    muscles: { core: 1 }, regions: ['lowerBack'], safeToFailure: true, repWindow: [10, 25],
    cues: ['Becken einrollen, Knie Richtung Brust', 'Langsam ablassen, kein Schwung']
  },
  {
    id: 'hollowRock', name: 'Hollow Body Rock', pattern: 'core',
    muscles: { core: 1 }, regions: ['lowerBack'], safeToFailure: true, repWindow: [10, 25],
    cues: ['Bananenform, unterer Rücken am Boden', 'Vor und zurück schaukeln']
  },
  {
    id: 'dragonFlagNeg', name: 'Dragon Flag – absenken (am Sofa festhalten)', pattern: 'core',
    muscles: { core: 1 }, requires: { anchorsAny: ['sofa', 'fixedObject'] }, regions: ['lowerBack', 'neck', 'shoulder'],
    safeToFailure: false, skill: true, repWindow: [3, 8],
    cues: ['Rückenlage, hinter dem Kopf am Sofa festhalten', 'Körper gestreckt auf die Schultern hochbringen', 'So langsam wie möglich absenken']
  }
];

export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<string, Exercise>;

export const TECHNIQUE_LABELS = {
  lengthenedPartials: 'Letzter Satz: nach dem Versagen gedehnte Teilwiederholungen anhängen',
  restPause: 'Letzter Satz: Rest-Pause – 15 s Pause, dann nochmal bis kurz vor Versagen (2×)',
  slowEccentric: 'Alle Sätze: 4 s absenken',
  stretchPause: 'Alle Sätze: 2 s Pause in der gedehnten Position'
} as const;
