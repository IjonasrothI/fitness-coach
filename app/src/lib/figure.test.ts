import { describe, expect, it } from 'vitest';
import { EXERCISES } from './exercises';
import { canon, cycleLength, ik, joints, plank, poseAt, SEG } from './figure';
import { MOTIONS } from './motions';

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

describe('Strichfigur (M7)', () => {
  it('IK erreicht erreichbare Ziele mit festen Knochenlängen', () => {
    const [u, w] = ik([0, 0], [10, 30], SEG.thigh, SEG.shin, 'fwd');
    const knee: [number, number] = [Math.sin((u * Math.PI) / 180) * 24, Math.cos((u * Math.PI) / 180) * 24];
    const ankle: [number, number] = [knee[0] + Math.sin((w * Math.PI) / 180) * 23, knee[1] + Math.cos((w * Math.PI) / 180) * 23];
    expect(dist(ankle, [10, 30])).toBeLessThan(0.01);
    expect(knee[0]).toBeGreaterThan(5); // Knie zeigt nach vorn
  });
  it('gerader Körper: Hüfte liegt auf der Linie Knöchel–Schulter', () => {
    const { hip } = plank([-70, -8], [0, -32]);
    expect(dist(hip, [-70, -8])).toBeCloseTo(47, 0);
  });
  it('jede Übung hat eine Animation', () => {
    for (const e of EXERCISES) expect(MOTIONS[e.id], e.id).toBeDefined();
  });
  it('Animationen: Knochen behalten ihre Länge, Figur bleibt über dem Boden', () => {
    for (const [id, m] of Object.entries(MOTIONS)) {
      const cs = m.frames.map((f) => canon(f, m.front));
      expect(m.dur.length, id).toBe(m.frames.length);
      for (let k = 0; k < 24; k++) {
        const j = joints(poseAt(m, cs, (cycleLength(m) * k) / 24), m.front);
        expect(dist(j.kneeN, j.ankleN), id).toBeCloseTo(SEG.shin, 1);
        expect(dist(j.elbowN, j.handN), id).toBeCloseTo(SEG.fore, 1);
        const lowest = Math.max(j.kneeN[1], j.kneeF[1], j.handN[1], j.handF[1], j.hip[1], j.sh[1]);
        expect(lowest, `${id}: Körper unter dem Boden`).toBeLessThan(4);
        expect(j.head[1] + SEG.head, `${id}: Kopf unter dem Boden`).toBeLessThan(6);
      }
    }
  });
});
