import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CoachDB } from './db';
import { newProfile } from './defaults';
import { intervalSet } from './endurance';
import {
  adherence, endurancePlateau, noiseOf, patternSeries, recoveryIssue, smooth, streakWeeks, strengthPlateau, trend,
  weeklyStats, type Point, type WeekStat
} from './progress';
import { blockReview, getIntervalFormat, getVolumeBoost, undoProgressChange } from './progressStore';
import { buildSession, ladder, weeklyTarget } from './strength';
import type { CheckIn, PatternState, Profile, StrengthSession } from './types';

const NOW = new Date('2026-11-24T12:00:00');
const day = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString().slice(0, 10);
const series = (vals: number[], every = 4): Point[] => vals.map((v, i) => ({ date: day((vals.length - 1 - i) * every), value: v }));
function profile(): Profile { return { ...newProfile(), name: 'T', birthYear: 1990 }; }

describe('Glättung & echte Veränderung (F16, F20)', () => {
  it('Messfehler aus Differenzen', () => {
    expect(noiseOf([10, 10, 10, 10])).toBe(0);
    expect(noiseOf([10, 12, 10, 12, 10])).toBeGreaterThan(1);
  });
  it('Kalman glättet Ausreißer', () => {
    const { series: s } = smooth(series([50, 50, 50, 60, 50, 50]));
    expect(s[3]!.est).toBeLessThan(60);
    expect(s[3]!.est).toBeGreaterThan(50);
  });
  it('steigend / flach / unklar', () => {
    expect(trend(series([1, 1.2, 1.4, 1.5, 1.7, 1.9, 2.1, 2.3, 2.4, 2.6, 2.8]), 42, NOW, { minNoise: 0.05 }).trend).toBe('up');
    expect(trend(series([2, 2.1, 1.9, 2, 2.1, 1.9, 2, 2.1, 2, 1.9, 2]), 42, NOW, { minNoise: 0.05 }).trend).toBe('flat');
    expect(trend(series([1, 2]), 42, NOW).trend).toBe('unclear');
    // Reihenfolge egal (Check-ins kommen absteigend)
    expect(trend(series([1, 1.2, 1.4, 1.5, 1.7, 1.9, 2.1, 2.3, 2.4, 2.6, 2.8]).reverse(), 42, NOW, { minNoise: 0.05 }).trend).toBe('up');
    // Rauschen allein ist kein Fortschritt
    expect(trend(series([2, 2.6, 1.8, 2.5, 1.9, 2.7, 2.0, 2.4]), 42, NOW).trend).toBe('flat');
  });
});

describe('Kraftniveau & Plateau (K18)', () => {
  const p = profile();
  it('Niveau = Leiterstufe + Position im Fenster, stetig über Stufenwechsel', () => {
    const steps = ladder('squat', p, []);
    const mk = (i: number, n: number, reps: number): StrengthSession => ({
      id: `s${i}`, profileId: p.id, kind: 'strength', status: 'done', startedAt: `${day(n)}T10:00:00`, plannedMinutes: 40,
      plan: [{ pattern: 'squat', exerciseId: steps[i]!.exerciseId, bandLevel: steps[i]!.bandLevel, sets: 3, repWindow: [8, 20], restSec: 90, calibrationLastSet: false }],
      sets: [{ pattern: 'squat', exerciseId: steps[i]!.exerciseId, bandLevel: steps[i]!.bandLevel, reps, rir: 0, at: `${day(n)}T10:00:00` }]
    });
    const s = patternSeries([mk(1, 10, 20), mk(2, 5, 8)], p, 0).squat!;
    expect(s[0]!.value).toBeCloseTo(2, 1);
    expect(s[1]!.value).toBeGreaterThanOrEqual(2);
    expect(s[1]!.value).toBeLessThan(2.5);
  });
  it('Tagesform-gedeckelte Einheiten zählen nicht', () => {
    const steps = ladder('squat', p, []);
    const s: StrengthSession = {
      id: 'x', profileId: p.id, kind: 'strength', status: 'done', startedAt: `${day(1)}T10:00:00`, plannedMinutes: 40,
      plan: [{ pattern: 'squat', exerciseId: steps[0]!.exerciseId, sets: 3, repWindow: [8, 20], restSec: 90, calibrationLastSet: false, minRir: 3 }],
      sets: [{ pattern: 'squat', exerciseId: steps[0]!.exerciseId, reps: 10, rir: 3, at: `${day(1)}T10:00:00` }]
    };
    expect(patternSeries([s], p, 0).squat).toBeUndefined();
  });
  const flat = series([2, 2.1, 2, 2, 2.1, 2, 2, 2.1, 2, 2, 2.05]);
  const up = series([1, 1.2, 1.4, 1.5, 1.7, 1.9, 2.1, 2.3, 2.4, 2.6, 2.8]);
  it('Plateau, wenn die Mehrheit flach ist und Adhärenz stimmt', () => {
    expect(strengthPlateau({ squat: flat, hinge: flat, hPush: flat, hPull: up }, 0.9, NOW).plateau).toBe(true);
    expect(strengthPlateau({ squat: flat, hinge: up, hPush: up, hPull: up }, 0.9, NOW).plateau).toBe(false);
  });
  it('kein Plateau bei geringer Adhärenz oder zu wenig Daten', () => {
    expect(strengthPlateau({ squat: flat, hinge: flat, hPush: flat }, 0.6, NOW).plateau).toBe(false);
    expect(strengthPlateau({ squat: flat }, 0.9, NOW).plateau).toBe(false);
  });
  it('Volumenzuschlag erhöht Wochenziel (max. 20) und Sätze', () => {
    expect(weeklyTarget(p, 'quads', 0)).toBe(10);
    expect(weeklyTarget(p, 'quads', 4)).toBe(14);
    expect(weeklyTarget({ ...p, goals: { ...p.goals, focus: 10 } }, 'quads', 40)).toBe(20);
    const states = (['squat', 'hPush', 'hPull'] as const).map((pat): PatternState => ({
      id: pat, profileId: p.id, pattern: pat, step: ladder(pat, p)[0]!, placed: true, history: [], blocked: []
    }));
    const base = buildSession(p, states, [], 60, { rirOffset: 0, calibrate: false });
    const more = buildSession(p, states, [], 60, { rirOffset: 0, calibrate: false, volumeBoost: 2 });
    expect(more.reduce((a, x) => a + x.sets, 0)).toBeGreaterThan(base.reduce((a, x) => a + x.sets, 0));
  });
});

describe('Ausdauer-Plateau (F17)', () => {
  const flat = series([1.6, 1.62, 1.59, 1.61, 1.6, 1.62, 1.6, 1.61, 1.6, 1.59, 1.61, 1.6, 1.62, 1.6, 1.61], 4);
  const up = series([1.5, 1.52, 1.53, 1.55, 1.56, 1.58, 1.6, 1.61, 1.63, 1.65, 1.66, 1.68, 1.7, 1.71, 1.73], 4);
  it('flach + gute Adhärenz → Plateau', () => {
    expect(endurancePlateau(flat, [], 0.9, NOW).plateau).toBe(true);
    expect(endurancePlateau(up, [], 0.9, NOW).plateau).toBe(false);
  });
  it('besserer Feldtest schlägt flache Effizienz', () => {
    expect(endurancePlateau(flat, [{ date: day(60), value: 3.5 }, { date: day(5), value: 3.7 }], 0.9, NOW).plateau).toBe(false);
  });
  it('Adhärenz < 80 % → erst regelmäßig trainieren', () => {
    const r = endurancePlateau(flat, [], 0.5, NOW);
    expect(r.plateau).toBe(false);
    expect(r.reason).toContain('80');
  });
  it('Intervallformate wechseln', () => {
    expect(intervalSet(50, 0).reps).toBe('4 × 4 min');
    expect(intervalSet(30, 1).reps).toBe('4 × 3 min');
    expect(intervalSet(50, 2).reps).toContain('30 s');
    expect(intervalSet(50, 3).reps).toBe('4 × 4 min');
  });
});

describe('Wochen, Adhärenz, Serie', () => {
  it('Adhärenz und nachsichtige Serie (F23)', () => {
    const w = (planned: number, done: number): WeekStat => ({ weekStart: '', strengthMin: 0, enduranceMin: 0, hardSets: 0, load: 0, planned, done });
    expect(adherence([w(4, 4), w(4, 3)])).toBeCloseTo(7 / 8);
    expect(adherence([w(1, 1)])).toBeNull();
    expect(streakWeeks([w(4, 1), w(4, 3), w(4, 4), w(4, 0)])).toBe(2); // laufende Woche noch offen
    expect(streakWeeks([w(4, 4), w(4, 1), w(4, 4)])).toBe(1);
    expect(streakWeeks([{ ...w(0, 0), enduranceMin: 40 }, w(4, 3)])).toBe(2); // Wochen ohne Plan zählen über Trainingszeit
  });
  it('Wochenstatistik aus Plan und Einheiten', () => {
    const ws = '2026-11-16';
    const plan = {
      id: 'x', profileId: 'p', weekStart: ws, deload: false, blockWeek: 1, why: [], createdAt: '', updatedAt: '',
      days: [{ date: ws, availableMin: 40, items: [{ id: 'a', kind: 'strength' as const, minutes: 40 }] },
        { date: '2026-11-18', availableMin: 40, items: [{ id: 'b', kind: 'endurance' as const, minutes: 40, sport: 'run' as const, type: 'easy' as const }] }]
    };
    const st: StrengthSession = { id: 's', profileId: 'p', kind: 'strength', status: 'done', startedAt: `${ws}T10:00:00`, finishedAt: `${ws}T10:35:00`, plannedMinutes: 40, plan: [], sets: [{ pattern: 'squat', exerciseId: 'x', reps: 12, rir: 1, at: '' }] };
    const [r] = weeklyStats([ws], [plan], [st], [], 0, '2026-11-24');
    expect(r).toMatchObject({ strengthMin: 35, hardSets: 1, planned: 2, done: 1 });
  });
  it('Erholung zuerst prüfen (F17)', () => {
    const c = (n: number, sleepH: number): CheckIn => ({
      id: `${n}`, profileId: 'p', date: day(n), at: '', sleepH, sleepQ: 3, energy: 3, soreness: 2, sorenessRegions: [], stress: 2,
      motivation: 3, pain: [], sick: false, warning: []
    });
    expect(recoveryIssue([1, 2, 3, 4, 5].map((n) => c(n, 6)), NOW)).toContain('Schlaf');
    expect(recoveryIssue([1, 2, 3, 4, 5].map((n) => c(n, 8)), NOW)).toBeNull();
  });
});

describe('Blockwechsel (F24) mit Rückgängig', () => {
  it('wertet nur einmal je Block aus und wechselt das Intervallformat nach 12 Wochen', async () => {
    const d = new CoachDB(`progress-${Math.random()}`);
    const p = profile();
    await d.profiles.put(p);
    expect(await blockReview(p, '2026-08-31', d, NOW)).toEqual([]);
    expect(await getIntervalFormat(p.id, d)).toBe(0);
    expect(await blockReview(p, '2026-08-31', d, NOW)).toEqual([]);
    const notes = await blockReview(p, '2026-11-23', d, NOW);
    expect(notes).toContain('Intervallformat gewechselt.');
    expect(await getIntervalFormat(p.id, d)).toBe(1);
    expect(await getVolumeBoost(p.id, d)).toBe(0); // kein Kraft-Plateau ohne Daten
    const c = (await d.changes.toArray()).find((x) => x.kind === 'intervalFormat')!;
    expect(await undoProgressChange(p, c, d)).toBe(true);
    expect(await getIntervalFormat(p.id, d)).toBe(0);
  });
});
