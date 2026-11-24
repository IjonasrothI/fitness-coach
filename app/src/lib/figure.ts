// Strichfigur mit Gelenken für Übungsanimationen (M7). Reine Geometrie – testbar, offline.
// Koordinaten: x nach vorn (rechts), y nach unten, Boden bei y = 0. Körpergröße ≈ 97 Einheiten.
// Winkel in Grad, absolut: 0 = nach unten, 90 = nach vorn, 180 = nach oben, −90 = nach hinten.

export type Vec = [number, number];
export const SEG = { torso: 30, neck: 11, head: 6, upper: 16, fore: 15, thigh: 24, shin: 23, foot: 8 } as const;

export type Hint = 'fwd' | 'back' | 'up' | 'down';
/** Gliedmaße: entweder Winkel [oben, unten, Fuß] oder Ziel für Hand/Knöchel (2-Gelenk-IK). */
export type Limb = [number, number, number?] | { to: Vec; bend?: Hint; rel?: boolean; foot?: number };

export interface Pose {
  hip: Vec;
  /** Rumpfwinkel Hüfte → Schulter */
  t: number;
  /** Kopfneigung relativ zum Rumpf */
  h?: number;
  an: Limb; af?: Limb; ln: Limb; lf?: Limb;
  /** Gelenk auf einen Punkt verschieben (z. B. Zehen auf die Stufe) */
  at?: { j: JointName; p: Vec };
}

export interface Canon {
  hip: Vec; t: number; h: number;
  an: [number, number]; af: [number, number];
  ln: [number, number, number]; lf: [number, number, number];
}

export type JointName =
  | 'hip' | 'sh' | 'head' | 'elbowN' | 'handN' | 'elbowF' | 'handF'
  | 'kneeN' | 'ankleN' | 'toeN' | 'heelN' | 'kneeF' | 'ankleF' | 'toeF' | 'heelF' | 'shN' | 'shF' | 'hipN' | 'hipF';
export type Joints = Record<JointName, Vec>;

export type Prop =
  | { k: 'sofa'; x: number; w: number; h?: number; back?: 'left' | 'right' }
  | { k: 'step'; x: number; w: number; h: number }
  | { k: 'table'; x: number; w: number; h: number }
  | { k: 'wall'; x: number }
  | { k: 'post'; x: number; h: number }
  | { k: 'cushion'; x: number }
  | { k: 'kb'; j: JointName; d?: Vec }
  | { k: 'db'; j: JointName }
  | { k: 'band'; a: JointName | Vec; b: JointName; via?: JointName }
  | { k: 'towel'; j: JointName };

export interface Motion {
  frames: Pose[];
  /** Dauer der Übergänge in s: frames[i] → frames[i+1], der letzte zurück zu frames[0] */
  dur: number[];
  /** Haltezeit je Frame in s */
  hold?: number[];
  props?: Prop[];
  /** Vorderansicht (Seitheben): Arme/Beine links/rechts statt nah/fern */
  front?: boolean;
  /** kurze Tempo-Angabe, z. B. „3 s runter · 1 s hoch“ */
  tempo?: string;
}

const RAD = Math.PI / 180;
export const dir = (a: number): Vec => [Math.sin(a * RAD), Math.cos(a * RAD)];
export const angleOf = (v: Vec): number => Math.atan2(v[0], v[1]) / RAD;
const add = (a: Vec, b: Vec, s = 1): Vec => [a[0] + b[0] * s, a[1] + b[1] * s];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const len = (v: Vec) => Math.hypot(v[0], v[1]);
const HINT: Record<Hint, Vec> = { fwd: [1, 0], back: [-1, 0], up: [0, -1], down: [0, 1] };

/** 2-Gelenk-IK: Winkel für Ober- und Unterteil, damit das Ende `target` erreicht (bzw. so nah wie möglich). */
export function ik(root: Vec, target: Vec, a: number, b: number, hint: Hint): [number, number] {
  const v = sub(target, root);
  const d = Math.max(Math.abs(a - b) + 0.01, Math.min(a + b - 0.001, len(v)));
  const base = angleOf(v);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (a * a + d * d - b * b) / (2 * a * d)))) / RAD;
  const end = add(root, dir(base), d);
  const mid: Vec = [(root[0] + end[0]) / 2, (root[1] + end[1]) / 2];
  const cand = [base + alpha, base - alpha].map((u) => {
    const j = add(root, dir(u), a);
    return { u, j, score: (j[0] - mid[0]) * HINT[hint][0] + (j[1] - mid[1]) * HINT[hint][1] };
  });
  const best = cand[0]!.score >= cand[1]!.score ? cand[0]! : cand[1]!;
  return [best.u, angleOf(sub(end, best.j))];
}

function roots(hip: Vec, t: number, front: boolean) {
  const sh = add(hip, dir(t), SEG.torso);
  return {
    sh,
    shN: front ? add(sh, [9, 0]) : sh, shF: front ? add(sh, [-9, 0]) : sh,
    hipN: front ? add(hip, [4, 0]) : hip, hipF: front ? add(hip, [-4, 0]) : hip
  };
}

function solveLimb(l: Limb, root: Vec, a: number, b: number, defHint: Hint, defFoot: number): [number, number, number] {
  if (Array.isArray(l)) return [l[0], l[1], l[2] ?? defFoot];
  const target = l.rel ? add(root, l.to) : l.to;
  const [u, w] = ik(root, target, a, b, l.bend ?? defHint);
  return [u, w, l.foot ?? defFoot];
}

/** Pose → kanonische Winkel (IK gelöst, Verschiebung angewendet). */
export function canon(p: Pose, front = false): Canon {
  const r = roots(p.hip, p.t, front);
  const an = solveLimb(p.an, r.shN, SEG.upper, SEG.fore, 'down', 0);
  const af = solveLimb(p.af ?? p.an, p.af ? r.shF : r.shN, SEG.upper, SEG.fore, 'down', 0);
  const ln = solveLimb(p.ln, r.hipN, SEG.thigh, SEG.shin, 'fwd', front ? 70 : 90);
  const lf = solveLimb(p.lf ?? p.ln, p.lf ? r.hipF : r.hipN, SEG.thigh, SEG.shin, 'fwd', front ? -70 : 90);
  if (front && !p.af) { af[0] = -an[0]; af[1] = -an[1]; }
  if (front && !p.lf) { lf[0] = -ln[0]; lf[1] = -ln[1]; lf[2] = -ln[2]; }
  let c: Canon = { hip: p.hip, t: p.t, h: p.h ?? 0, an: [an[0], an[1]], af: [af[0], af[1]], ln, lf };
  if (p.at) {
    const j = joints(c, front)[p.at.j];
    c = { ...c, hip: add(c.hip, sub(p.at.p, j)) };
  }
  return c;
}

/** Vorwärtskinematik */
export function joints(c: Canon, front = false): Joints {
  const r = roots(c.hip, c.t, front);
  const limb = (root: Vec, u: number, w: number, a: number, b: number): [Vec, Vec] => {
    const j = add(root, dir(u), a);
    return [j, add(j, dir(w), b)];
  };
  const [elbowN, handN] = limb(r.shN, c.an[0], c.an[1], SEG.upper, SEG.fore);
  const [elbowF, handF] = limb(r.shF, c.af[0], c.af[1], SEG.upper, SEG.fore);
  const [kneeN, ankleN] = limb(r.hipN, c.ln[0], c.ln[1], SEG.thigh, SEG.shin);
  const [kneeF, ankleF] = limb(r.hipF, c.lf[0], c.lf[1], SEG.thigh, SEG.shin);
  return {
    hip: c.hip, sh: r.sh, shN: r.shN, shF: r.shF, hipN: r.hipN, hipF: r.hipF,
    head: add(r.sh, dir(c.t + c.h), SEG.neck),
    elbowN, handN, elbowF, handF, kneeN, ankleN, kneeF, ankleF,
    toeN: add(ankleN, dir(c.ln[2]), SEG.foot), heelN: add(ankleN, dir(c.ln[2]), -2.5),
    toeF: add(ankleF, dir(c.lf[2]), SEG.foot), heelF: add(ankleF, dir(c.lf[2]), -2.5)
  };
}

const lerpA = (a: number, b: number, f: number) => a + ((((b - a) % 360) + 540) % 360 - 180) * f;
const lerpV = (a: Vec, b: Vec, f: number): Vec => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

export function mix(a: Canon, b: Canon, f: number): Canon {
  return {
    hip: lerpV(a.hip, b.hip, f), t: lerpA(a.t, b.t, f), h: lerpA(a.h, b.h, f),
    an: [lerpA(a.an[0], b.an[0], f), lerpA(a.an[1], b.an[1], f)],
    af: [lerpA(a.af[0], b.af[0], f), lerpA(a.af[1], b.af[1], f)],
    ln: [lerpA(a.ln[0], b.ln[0], f), lerpA(a.ln[1], b.ln[1], f), lerpA(a.ln[2], b.ln[2], f)],
    lf: [lerpA(a.lf[0], b.lf[0], f), lerpA(a.lf[1], b.lf[1], f), lerpA(a.lf[2], b.lf[2], f)]
  };
}

const ease = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;

export function cycleLength(m: Motion): number {
  return m.dur.reduce((a, b) => a + b, 0) + (m.hold ?? []).reduce((a, b) => a + b, 0);
}

/** Pose zum Zeitpunkt `time` (s) im Zyklus. */
export function poseAt(m: Motion, cs: Canon[], time: number): Canon {
  let t = time % cycleLength(m);
  for (let i = 0; i < cs.length; i++) {
    const hold = m.hold?.[i] ?? 0;
    if (t < hold) return cs[i]!;
    t -= hold;
    const d = m.dur[i] ?? 1;
    if (t < d) return mix(cs[i]!, cs[(i + 1) % cs.length]!, ease(t / d));
    t -= d;
  }
  return cs[0]!;
}

/** Sichtbereich aus allen Frames und festen Requisiten, Seitenverhältnis 4:3. */
export function viewBox(m: Motion, cs: Canon[]): [number, number, number, number] {
  const pts: Vec[] = [];
  for (let i = 0; i < cs.length; i++) {
    for (const f of [0, 0.5]) {
      const j = joints(mix(cs[i]!, cs[(i + 1) % cs.length]!, f), m.front);
      pts.push(...Object.values(j));
      pts.push(add(j.head, [0, -SEG.head]), add(j.head, [0, SEG.head]));
    }
  }
  for (const p of m.props ?? []) {
    if (p.k === 'sofa') pts.push([p.x, -(p.h ?? 24) - (p.back ? 18 : 0)], [p.x + p.w, 0]);
    if (p.k === 'step' || p.k === 'table') pts.push([p.x, -p.h], [p.x + p.w, 0]);
    if (p.k === 'post') pts.push([p.x, -p.h]);
    if (p.k === 'band' && Array.isArray(p.a)) pts.push(p.a);
  }
  pts.push([0, 2]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  let x0 = Math.min(...xs) - 9; let x1 = Math.max(...xs) + 9;
  let y0 = Math.min(...ys) - 9; let y1 = Math.max(...ys) + 5;
  const w = x1 - x0; const h = y1 - y0;
  if (w / h < 4 / 3) { const nw = (h * 4) / 3; x0 -= (nw - w) / 2; x1 = x0 + nw; }
  else { const nh = (w * 3) / 4; y0 -= nh - h; y1 = y0 + nh; }
  return [x0, y0, x1 - x0, y1 - y0];
}

/** Gerader Körper (Liegestütz, Rudern unter dem Tisch): Hüfte und Rumpfwinkel aus Knöchel und Schulter. */
export function plank(ankle: Vec, shoulder: Vec): { hip: Vec; t: number } {
  const v = sub(shoulder, ankle);
  const u: Vec = [v[0] / len(v), v[1] / len(v)];
  const legs = SEG.thigh + SEG.shin;
  return { hip: add(ankle, u, legs), t: angleOf(u) };
}

/** Ganze Pose um einen Winkel drehen (z. B. Hollow Rock). */
export function tilt(p: Pose, deg: number): Pose {
  const r = (l?: Limb): Limb | undefined => (l && Array.isArray(l) ? [l[0] + deg, l[1] + deg, l[2] !== undefined ? l[2] + deg : undefined] : l);
  return { ...p, t: p.t + deg, an: r(p.an)!, af: r(p.af), ln: r(p.ln)!, lf: r(p.lf) };
}
