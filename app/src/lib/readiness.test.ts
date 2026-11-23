import { describe, expect, it } from 'vitest';
import { newProfile } from './defaults';
import { amenorrheaHint, painAdvice, readiness, todayKey } from './readiness';
import type { CheckIn } from './types';

const p = { ...newProfile(), name: 'T' };

function ci(date: string, o: Partial<CheckIn> = {}): CheckIn {
  return {
    id: `${p.id}:${date}`, profileId: p.id, date, at: `${date}T07:00:00Z`, sleepH: 7.5, sleepQ: 3, energy: 3,
    soreness: 3, sorenessRegions: [], stress: 3, motivation: 3, pain: [], sick: false, warning: [], ...o
  };
}
const day = (n: number) => {
  const d = new Date('2026-11-23T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

describe('Ampel (F2–F4)', () => {
  it('normaler Tag → grün', () => {
    const r = readiness(ci(day(0)), [], p);
    expect(r.light).toBe('green');
    expect(r.caps.noIntensity).toBe(false);
  });
  it('schlechtes Befinden → gelb, dann rot', () => {
    const y = readiness(ci(day(0), { energy: 2, soreness: 4, stress: 4, motivation: 2, sleepQ: 2 }), [], p);
    expect(y.light).toBe('yellow');
    expect(y.caps.minRir).toBe(2);
    const r = readiness(ci(day(0), { energy: 1, soreness: 5, stress: 5, motivation: 1, sleepQ: 1, sleepH: 5 }), [], p);
    expect(r.light).toBe('red');
    expect(r.caps.recoveryOnly).toBe(true);
  });
  it('persönliche Basis ab 14 Einträgen: wer immer 2 hat, ist mit 2 normal', () => {
    const hist = Array.from({ length: 20 }, (_, i) => ci(day(i + 1), { energy: 2, motivation: 2 }));
    const r = readiness(ci(day(0), { energy: 2, motivation: 2 }), hist, p);
    expect(r.light).toBe('green');
  });
  it('wenig Schlaf deckelt Intensität, sperrt aber nicht (F12)', () => {
    const r = readiness(ci(day(0), { sleepH: 5.5 }), [], p);
    expect(r.caps.noIntensity).toBe(true);
    expect(r.caps.noTraining).toBe(false);
  });
});

describe('Harte Overrides (F5, F26)', () => {
  it('krank → kein Training, auch mit Übersteuern', () => {
    const r = readiness(ci(day(0), { sick: true, override: true }), [], p);
    expect(r.caps.noTraining).toBe(true);
    expect(r.light).toBe('red');
  });
  it('Warnzeichen → harter Stopp mit Arzthinweis', () => {
    const r = readiness(ci(day(0), { warning: ['chestPain'] }), [], p);
    expect(r.caps.hardStop).toBe(true);
    expect(r.reasons[0]).toMatch(/112/);
  });
  it('Schmerz > 5 → Region geschont', () => {
    const r = readiness(ci(day(0), { pain: [{ region: 'knee', score: 6 }, { region: 'wrist', score: 3 }] }), [], p);
    expect(r.caps.painRegions).toEqual(['knee']);
  });
});

describe('Ruhepuls (F10)', () => {
  it('2 Tage ≥ Basis + 5 und schlechtes Befinden → keine Intensität', () => {
    const hist = [ci(day(1), { restingHr: 60 }), ...Array.from({ length: 10 }, (_, i) => ci(day(i + 2), { restingHr: 52 }))];
    const r = readiness(ci(day(0), { restingHr: 60, energy: 2, motivation: 2, stress: 4 }), hist, p);
    expect(r.caps.noIntensity).toBe(true);
    expect(r.reasons.some((x) => x.includes('Ruhepuls seit 2 Tagen'))).toBe(true);
  });
});

describe('Übersteuern (F21)', () => {
  it('gelb übersteuert → grün, ohne Deckel', () => {
    const r = readiness(ci(day(0), { energy: 2, soreness: 4, stress: 4, motivation: 2, sleepQ: 2, override: true }), [], p);
    expect(r.light).toBe('green');
    expect(r.overridden).toBe(true);
    expect(r.caps.minRir).toBe(1);
  });
});

describe('Verläufe', () => {
  it('Schmerz ≥ 10 von 14 Tagen ohne Besserung → Abklärung (F27)', () => {
    const list = Array.from({ length: 14 }, (_, i) => ci(day(i), { pain: [{ region: 'knee', score: 4 }] }));
    expect(painAdvice(list, 'knee', day(0))).toMatch(/abklären/);
    const better = Array.from({ length: 14 }, (_, i) => ci(day(i), { pain: [{ region: 'knee', score: 3 + Math.floor(i / 4) }] }));
    expect(painAdvice(better, 'knee', day(0))).toBeNull();
  });
  it('Periode > 90 Tage nicht erfasst → Hinweis (F28)', () => {
    expect(amenorrheaHint([ci(day(100), { period: true })], day(0))).toMatch(/RED-S/);
    expect(amenorrheaHint([ci(day(20), { period: true })], day(0))).toBeNull();
    expect(amenorrheaHint([], day(0))).toBeNull();
  });
  it('todayKey nutzt lokales Datum', () => {
    expect(todayKey(new Date(2026, 10, 23, 23, 30))).toBe('2026-11-23');
  });
});
