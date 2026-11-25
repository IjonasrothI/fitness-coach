// Bewegungsabläufe je Übung (M7): Keyframes der Strichfigur + Requisiten (Sofa, Band, Kettlebell …).
// Tempo nach den Hinweisen im Katalog (z. B. 3 s absenken, Pause in der Dehnung).
import { plank, tilt, type Motion, type Pose, type Prop } from './figure';
import { MOBILITY_MOTIONS } from './mobility';

// ---------- Bausteine ----------

const STAND = { hip: [0, -49] as [number, number], t: 180, ln: { to: [2, -3] as [number, number] }, lf: { to: [-1, -3] as [number, number] } };
function squat(o: { kb?: boolean; deep?: number } = {}): Motion {
  const arms = o.kb ? { to: [9, 4] as [number, number], rel: true, bend: 'down' as const } : ([95, 95] as [number, number]);
  return {
    frames: [
      { ...STAND, an: arms },
      { hip: [-12, -24 + (o.deep ?? 0)], t: 145, an: arms, ln: { to: [2, -3] }, lf: { to: [-1, -3] } }
    ],
    dur: [3, 1.2], hold: [0.6, 0.4], tempo: '3 s runter · zügig hoch',
    props: o.kb ? [{ k: 'kb', j: 'handN', d: [1, 4] }] : []
  };
}

function split(o: { rear?: 'floor' | 'sofa'; deficit?: boolean; kb?: boolean } = {}): Motion {
  const front: [number, number] = [14, o.deficit ? -7 : -3];
  const props: Prop[] = [];
  let back: Pose['lf'];
  let top: [number, number];
  let bottom: [number, number];
  if (o.rear === 'sofa') {
    props.push({ k: 'sofa', x: -66, w: 30, h: 24, back: 'left' });
    back = { to: [-34, -28], bend: 'down', foot: -95 };
    top = [-6, -45];
    bottom = [-10, o.deficit ? -20 : -24];
  } else {
    back = { to: [-24, -7], bend: 'down', foot: 50 };
    top = [-4, -46];
    bottom = [-6, -26];
  }
  if (o.deficit) props.push({ k: 'step', x: 6, w: 20, h: 4 });
  if (o.kb) props.push({ k: 'kb', j: 'handN', d: [0, 4] });
  return {
    frames: [
      { hip: top, t: 178, an: HANG_A, ln: { to: front }, lf: back },
      { hip: bottom, t: 168, an: HANG_A, ln: { to: front }, lf: back }
    ],
    dur: [2.5, 1.2], hold: [0.5, 0.6], props, tempo: 'langsam runter · zügig hoch'
  };
}
const HANG_A: [number, number] = [4, 4];

function rdl(): Motion {
  return {
    frames: [
      { hip: [0, -49], t: 180, an: [0, 0], ln: { to: [2, -3] }, lf: { to: [-6, -7], foot: 40 } },
      { hip: [-6, -47], t: 95, an: [5, 5], ln: { to: [2, -3] }, lf: [-85, -85, 0] }
    ],
    dur: [2.5, 1.5], hold: [0.4, 2], tempo: '2 s Pause unten in der Dehnung',
    props: [{ k: 'kb', j: 'handN', d: [0, 4] }]
  };
}

function slidingCurl(single = false): Motion {
  const arms = { to: [-2, -2] as [number, number] };
  const free: Pose['lf'] = single ? [150, 150, 180] : undefined;
  return {
    frames: [
      { hip: [0, -16], t: -67, h: -30, an: arms, ln: { to: [14, -3], bend: 'up', foot: 180 }, lf: free ?? { to: [14, -3], bend: 'up', foot: 180 } },
      { hip: [0, -12], t: -72, h: -25, an: arms, ln: { to: [40, -3], bend: 'up', foot: 180 }, lf: free ?? { to: [40, -3], bend: 'up', foot: 180 } }
    ],
    dur: [3, 1.2], hold: [0.5, 0.3], tempo: '3 s ausstrecken · kraftvoll heranziehen',
    props: [{ k: 'towel', j: 'heelN' }]
  };
}

function nordic(full: boolean): Motion {
  const knees = { to: [-23, -4] as [number, number], bend: 'down' as const, foot: -95 };
  return {
    frames: [
      { hip: [0, -28], t: 180, an: { to: [7, 6], rel: true, bend: 'down' }, ln: knees },
      { hip: [20.8, -16], t: 120, an: { to: [50, -3], bend: 'back' }, ln: knees }
    ],
    dur: [4, full ? 2 : 2.5], hold: [0.6, 0.4], tempo: full ? '4 s absenken · aus eigener Kraft hoch' : 'so langsam wie möglich absenken',
    props: [{ k: 'sofa', x: -60, w: 34, h: 24 }, { k: 'cushion', x: 0 }]
  };
}

function bridge(o: { sofa?: boolean; single?: boolean; band?: boolean; kb?: boolean } = {}): Motion {
  const feet = { to: [o.sofa ? 22 : 24, -3] as [number, number], bend: 'up' as const };
  const free: Pose['lf'] = o.single ? { to: [18, -20], rel: true, bend: 'up', foot: 120 } : undefined;
  const props: Prop[] = [];
  if (o.sofa) props.push({ k: 'sofa', x: -64, w: 36, h: 24, back: 'left' });
  if (o.kb) props.push({ k: 'kb', j: 'hip', d: [0, -6] });
  if (o.band) props.push({ k: 'band', a: [-10, -1], b: 'hip', via: 'hip' });
  const frames: Pose[] = o.sofa
    ? [
        { hip: [-4, -10], t: -129, h: 25, an: { to: [-14, -18], bend: 'down' }, ln: feet, lf: free },
        { hip: [-2, -27], t: -90, h: 20, an: { to: [-14, -18], bend: 'down' }, ln: feet, lf: free }
      ]
    : [
        { hip: [0, -6], t: -85, h: -10, an: { to: [-4, -2] }, ln: feet, lf: free },
        { hip: [0, -22], t: -60, h: -30, an: { to: [-4, -2] }, ln: feet, lf: free }
      ];
  return { frames, dur: [1.2, 2], hold: [0.4, o.single || o.band ? 2 : 1], props, tempo: 'oben halten · langsam ablassen' };
}

function pushup(o: { incline?: boolean; deficit?: boolean; band?: boolean; slow?: boolean } = {}): Motion {
  const props: Prop[] = [];
  let hand: [number, number] = [0, -1];
  let ankle: [number, number] = [-71, -8];
  let top: [number, number] = [0, -32];
  let bottom: [number, number] = [6, -12];
  if (o.incline) {
    props.push({ k: 'sofa', x: 4, w: 36, h: 24, back: 'right' });
    hand = [8, -25]; ankle = [-60, -8]; top = [-2, -55]; bottom = [9, -36];
  }
  if (o.deficit) {
    hand = [0, -5]; top = [0, -36]; bottom = [5, -9];
    props.push({ k: 'db', j: 'handN' });
  }
  if (o.band) props.push({ k: 'band', a: 'handN', b: 'handN', via: 'sh' });
  const pose = (sh: [number, number]): Pose => {
    const { hip, t } = plank(ankle, sh);
    return { hip, t, an: { to: hand, bend: 'back' }, ln: { to: ankle, foot: 20 } };
  };
  return {
    frames: [pose(top), pose(bottom)],
    dur: [o.slow ? 4 : 2, 1], hold: [0.5, o.deficit ? 1 : 0.2], props,
    tempo: o.slow ? '3–5 s absenken' : '2 s runter · zügig hoch'
  };
}

function bandRowSeated(): Motion {
  const legs = { to: [46, -4] as [number, number], foot: 175 };
  return {
    frames: [
      { hip: [0, -6], t: 168, an: { to: [32, -20], bend: 'down' }, ln: legs },
      { hip: [0, -6], t: 182, an: { to: [8, -24], bend: 'back' }, ln: legs }
    ],
    dur: [1.2, 2], hold: [0.3, 1], tempo: 'Schulterblätter zusammen · langsam zurück',
    props: [{ k: 'band', a: 'toeN', b: 'handN' }]
  };
}

function bandRowStanding(pause = false): Motion {
  const legs = { ln: { to: [10, -3] as [number, number] }, lf: { to: [-10, -3] as [number, number] } };
  return {
    frames: [
      { hip: [-2, -48], t: 170, an: { to: [30, -70], bend: 'down' }, af: [8, 30], ...legs },
      { hip: [-2, -48], t: 175, an: { to: [-2, -56], bend: 'back' }, af: [8, 30], ...legs }
    ],
    dur: [1.2, 2], hold: [0.5, pause ? 2 : 0.6], tempo: pause ? '2 s Pause hinten' : 'kraftvoll ziehen · 2 s zurück',
    props: [{ k: 'post', x: 64, h: 80 }, { k: 'band', a: [62, -72], b: 'handN' }]
  };
}

function tableRow(): Motion {
  const ankle: [number, number] = [75, -4];
  const pose = (sh: [number, number]): Pose => {
    const { hip, t } = plank(ankle, sh);
    return { hip, t, h: 0, an: { to: [0, -40], bend: 'fwd' }, ln: { to: ankle, foot: 175 } };
  };
  return {
    frames: [pose([0, -10]), pose([4, -28])],
    dur: [1.2, 2], hold: [0.4, 0.6], tempo: 'Brust zur Kante · langsam ablassen',
    props: [{ k: 'table', x: -60, w: 62, h: 41 }]
  };
}

function bandPress(): Motion {
  return {
    frames: [
      { ...STAND, an: { to: [5, -3], rel: true, bend: 'down' } },
      { ...STAND, an: { to: [2, -31], rel: true, bend: 'back' } }
    ],
    dur: [1.2, 2], hold: [0.3, 0.6], tempo: 'hochdrücken · 2 s ablassen',
    props: [{ k: 'band', a: 'ankleN', b: 'handN' }]
  };
}

function pike(elevated = false): Motion {
  const props: Prop[] = [];
  let ankle: [number, number] = [-45, -6];
  let top: Pose['hip'] = [-24, -50];
  let bottom: Pose['hip'] = [-18, -46];
  let tTop = 45; let tBottom = 25;
  if (elevated) {
    props.push({ k: 'sofa', x: -74, w: 32, h: 24, back: 'left' });
    ankle = [-44, -27]; top = [-14, -58]; bottom = [-11, -50]; tTop = 15; tBottom = 8;
  }
  const legs = { to: ankle, foot: elevated ? 160 : 30 };
  return {
    frames: [
      { hip: top, t: tTop, an: { to: [0, -1], bend: 'back' }, ln: legs },
      { hip: bottom, t: tBottom, an: { to: [0, -1], bend: 'back' }, ln: legs }
    ],
    dur: [2, 1.2], hold: [0.4, 0.3], props, tempo: 'Kopf vor die Hände · kontrolliert'
  };
}

function wallHspu(): Motion {
  const legs: [number, number, number] = [176, 178, 175];
  return {
    frames: [
      { hip: [3, -62], t: 0, an: { to: [0, -1], bend: 'fwd' }, ln: legs, lf: [172, 176, 175] },
      { hip: [3, -45], t: 0, an: { to: [0, -1], bend: 'fwd' }, ln: legs, lf: [172, 176, 175] }
    ],
    dur: [4, 1.5], hold: [0.5, 1], tempo: '3–5 s absenken',
    props: [{ k: 'wall', x: 12 }, { k: 'cushion', x: 4 }]
  };
}

function pulldown(single = false): Motion {
  const knees = { to: [-23, -4] as [number, number], bend: 'down' as const, foot: -95 };
  const free: Pose['af'] = single ? [5, 5] : undefined;
  return {
    frames: [
      { hip: [0, -28], t: 178, an: { to: [12, -87], bend: 'back' }, af: free, ln: knees },
      { hip: [0, -28], t: 172, an: { to: [7, -50], bend: 'down' }, af: free, ln: knees }
    ],
    dur: [1.2, 2], hold: [0.6, 0.5], tempo: 'Ellbogen zur Hüfte · oben ganz strecken',
    props: [{ k: 'post', x: 30, h: 112 }, { k: 'band', a: [28, -108], b: 'handN' }, { k: 'cushion', x: 0 }]
  };
}

function latRaise(band = false): Motion {
  const legs = { ln: { to: [7, -3] as [number, number] } };
  const props: Prop[] = band ? [{ k: 'band', a: 'ankleF', b: 'handN' }] : [{ k: 'db', j: 'handN' }, { k: 'db', j: 'handF' }];
  return {
    front: true,
    frames: [
      { hip: [0, -49], t: 180, an: { to: [5, 30], rel: true, bend: 'up' }, af: band ? [-4, -4] : undefined, ...legs },
      { hip: [0, -49], t: 180, an: { to: [30, 3], rel: true, bend: 'down' }, af: band ? [-4, -4] : undefined, ...legs }
    ],
    dur: [1.2, 2], hold: [0.3, 0.4], props, tempo: 'bis Schulterhöhe · 2 s absenken'
  };
}

function overheadExt(): Motion {
  return {
    frames: [
      { hip: [0, -49], t: 180, an: [160, -30], af: [155, -35], ln: { to: [10, -3] }, lf: { to: [-12, -3] } },
      { hip: [0, -49], t: 180, an: [165, 168], af: [160, 165], ln: { to: [10, -3] }, lf: { to: [-12, -3] } }
    ],
    dur: [1.2, 2.5], hold: [0.6, 0.4], tempo: 'tief hinter den Kopf · strecken',
    props: [{ k: 'band', a: 'toeF', b: 'handN' }]
  };
}

function curl(behind = false): Motion {
  const legs = behind ? { ln: { to: [10, -3] as [number, number] }, lf: { to: [-10, -3] as [number, number] } } : { ln: STAND.ln, lf: STAND.lf };
  const up = behind ? -25 : 0;
  return {
    frames: [
      { hip: [0, -49], t: 180, an: [up, up], af: behind ? [2, 2] : undefined, ...legs },
      { hip: [0, -49], t: 180, an: [up, 155], af: behind ? [2, 2] : undefined, ...legs }
    ],
    dur: [1.2, 2], hold: [0.4, 0.4], tempo: 'Ellbogen fest · unten ganz strecken',
    props: behind ? [{ k: 'post', x: -48, h: 30 }, { k: 'band', a: [-46, -20], b: 'handN' }] : [{ k: 'band', a: 'ankleN', b: 'handN' }]
  };
}

function calf(o: { single?: boolean; kb?: boolean } = {}): Motion {
  const free: Pose['lf'] = o.single ? [8, -70, 20] : undefined;
  const arm: Pose['an'] = o.kb ? [0, 0] : [70, 85];
  const props: Prop[] = [{ k: 'step', x: 0, w: 30, h: 6 }];
  if (o.single && !o.kb) props.push({ k: 'wall', x: 34 });
  if (o.kb) props.push({ k: 'kb', j: 'handN', d: [0, 4] });
  return {
    frames: [
      { hip: [0, -50], t: 180, an: arm, ln: [0, 0, 112], lf: free ?? [0, 0, 112], at: { j: 'toeN', p: [5, -6] } },
      { hip: [0, -60], t: 180, an: arm, ln: [0, 0, 40], lf: free ?? [0, 0, 40], at: { j: 'toeN', p: [5, -6] } }
    ],
    dur: [1.2, 1.5], hold: [2, 0.8], props, tempo: 'unten 2 s halten · ganz hoch'
  };
}

const SUP = { hip: [0, -6] as [number, number], t: -90 };

function deadBug(): Motion {
  const start: Pose = { ...SUP, an: [180, 180], af: [176, 176], ln: [180, 90, 180], lf: [176, 88, 176] };
  return {
    frames: [
      start,
      { ...SUP, an: [-100, -100], af: [176, 176], ln: [180, 90, 180], lf: [95, 95, 160] },
      start,
      { ...SUP, an: [180, 180], af: [-100, -100], ln: [95, 95, 160], lf: [176, 88, 176] }
    ],
    dur: [2, 1.5, 2, 1.5], hold: [0.3, 0.6, 0.3, 0.6], tempo: 'langsam strecken · Rücken bleibt am Boden'
  };
}

function reverseCrunch(): Motion {
  const arms: [number, number] = [80, 90];
  return {
    frames: [
      { ...SUP, an: arms, ln: [165, 80, 150] },
      { hip: [3, -13], t: -76, an: arms, ln: [-150, 150, 180] }
    ],
    dur: [1.2, 2.5], hold: [0.3, 0.4], tempo: 'einrollen · langsam ablassen'
  };
}

function hollow(): Motion {
  const base: Pose = { hip: [0, -7], t: -100, h: -10, an: [-105, -105], ln: [100, 97, 170] };
  return {
    frames: [tilt(base, 7), tilt(base, -7)],
    dur: [0.8, 0.8], tempo: 'Bananenform halten · schaukeln'
  };
}

function dragonFlag(): Motion {
  const arms = { to: [-46, -8] as [number, number], bend: 'up' as const };
  return {
    frames: [
      { hip: [-31, -35], t: 0, h: -96, an: arms, ln: [180, 180, 180] },
      { hip: [-2.4, -9.8], t: -81, h: -15, an: arms, ln: [98, 98, 170] }
    ],
    dur: [5, 1.5], hold: [0.6, 0.3], tempo: 'so langsam wie möglich absenken',
    props: [{ k: 'sofa', x: -84, w: 34, h: 24, back: 'left' }]
  };
}

function skater(): Motion {
  return {
    frames: [
      { hip: [0, -49], t: 175, an: [90, 90], ln: { to: [2, -3] }, lf: { to: [-18, -28], bend: 'fwd', foot: -100 } },
      { hip: [-12, -27], t: 140, an: [95, 95], ln: { to: [2, -3] }, lf: { to: [-30, -10], bend: 'down', foot: -100 } }
    ],
    dur: [2.5, 1.2], hold: [0.5, 0.3], tempo: 'langsam runter · Knie Richtung Kissen',
    props: [{ k: 'cushion', x: -20 }]
  };
}

function pistol(box = false, kb = false): Motion {
  const props: Prop[] = box ? [{ k: 'sofa', x: -46, w: 32, h: 24, back: 'left' }] : [];
  if (kb) props.push({ k: 'kb', j: 'handN', d: [1, 4] });
  const arms: Pose['an'] = kb ? { to: [9, 4], rel: true, bend: 'down' } : [90, 90];
  return {
    frames: [
      { hip: [0, -49], t: 180, an: arms, ln: { to: [2, -3] }, lf: { to: [14, -10], foot: 100 } },
      { hip: box ? [-14, -27] : [-12, -16], t: 150, an: arms, ln: { to: [2, -3] }, lf: { to: [box ? 30 : 32, box ? -22 : -14], foot: 100 } }
    ],
    dur: [2.5, 1.5], hold: [0.4, box ? 0.5 : 0.3], props, tempo: box ? 'aufs Sofa absenken · ohne Schwung hoch' : 'volle Tiefe · Ferse unten'
  };
}

// ---------- Zuordnung ----------

export const MOTIONS: Record<string, Motion> = {
  gobletSquat: squat({ kb: true }),
  splitSquat: split(),
  bulgarian: split({ rear: 'sofa', kb: true }),
  bulgarianDeficit: split({ rear: 'sofa', deficit: true, kb: true }),
  skaterSquat: skater(),
  pistolBox: pistol(true),
  pistol: pistol(false),
  slRdl: rdl(),
  slidingCurl: slidingCurl(),
  slidingCurlSl: slidingCurl(true),
  nordicNeg: nordic(false),
  nordic: nordic(true),
  gluteBridge: bridge({ kb: true }),
  hipThrust: bridge({ sofa: true, kb: true }),
  hipThrustSl: bridge({ sofa: true, single: true }),
  hipThrustSlBand: bridge({ sofa: true, single: true, band: true }),
  pushupIncline: pushup({ incline: true }),
  pushup: pushup(),
  pushupDeficit: pushup({ deficit: true }),
  pushupBand: pushup({ deficit: true, band: true }),
  archer: pushup(),
  oneArmNeg: pushup({ slow: true }),
  bandRowSeated: bandRowSeated(),
  bandRowSa: bandRowStanding(),
  tableRow: tableRow(),
  bandRowSaPause: bandRowStanding(true),
  bandPress: bandPress(),
  pike: pike(),
  pikeElevated: pike(true),
  wallHspuNeg: wallHspu(),
  bandPulldown: pulldown(),
  bandPulldownSa: pulldown(true),
  bandPulldownSaPartials: pulldown(true),
  latRaiseDb: latRaise(),
  latRaiseBand: latRaise(true),
  diamondPushup: pushup(),
  bandOverheadExt: overheadExt(),
  bandCurl: curl(),
  bandCurlBehind: curl(true),
  calfRaise: calf(),
  calfRaiseSl: calf({ single: true }),
  calfRaiseSlKb: calf({ single: true, kb: true }),
  deadBug: deadBug(),
  reverseCrunch: reverseCrunch(),
  hollowRock: hollow(),
  dragonFlagNeg: dragonFlag(),
  ...MOBILITY_MOTIONS
};
