import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CoachDB } from './db';
import { newProfile } from './defaults';
import { EXERCISE_BY_ID, PATTERN_BY_ID } from './exercises';
import { chooseFormat, circuitSpec, estimateShaped, newRecords, shapePlan, timedOk } from './formats';
import { extendSession, getRatings, planStrength, rateExercise, startSession } from './training';
import type { PlannedExercise, Profile, StrengthSession } from './types';

const p = (): Profile => ({ ...newProfile(), name: 'T', birthYear: 1990 });
const pe = (pattern: PlannedExercise['pattern'], exerciseId: string, sets = 3): PlannedExercise => ({
  pattern, exerciseId, sets, repWindow: [8, 20], restSec: 90, calibrationLastSet: false
});

describe('Formatwahl (M7)', () => {
  it('Kurz und wenig Zeit → Zirkel', () => {
    expect(chooseFormat({ mood: 'short', minutes: 40, recentCount: 0, calibrate: false }).format).toBe('circuit');
    expect(chooseFormat({ mood: 'push', minutes: 10, recentCount: 0, calibrate: false }).format).toBe('circuit');
  });
  it('Motivation bestimmt den Wechsel', () => {
    const seq = (m: 'progress' | 'variety' | 'quick') => [0, 1, 2].map((n) => chooseFormat({ motivation: m, mood: 'push', minutes: 40, recentCount: n, calibrate: false }).format);
    expect(seq('progress')).toEqual(['classic', 'classic', 'timed']);
    expect(seq('variety')).toEqual(['classic', 'timed', 'circuit']);
    expect(seq('quick')).not.toContain('classic');
  });
  it('Kalibrierung braucht klassisch, Locker nie klassisch', () => {
    expect(chooseFormat({ motivation: 'variety', mood: 'push', minutes: 40, recentCount: 1, calibrate: true }).format).toBe('classic');
    expect(chooseFormat({ mood: 'easy', minutes: 40, recentCount: 0, calibrate: true }).format).not.toBe('classic');
  });
});

describe('Formen der Einheit', () => {
  const plan = [pe('squat', 'gobletSquat'), pe('hamstring', 'nordicNeg'), pe('hPush', 'pushup'), pe('hPull', 'bandRowSeated'), pe('hinge', 'gluteBridge'), pe('core', 'deadBug')];
  it('Fertigkeitsübungen nie unter Zeitdruck', () => {
    expect(timedOk('nordicNeg')).toBe(false);
    expect(timedOk('pushup')).toBe(true);
    const t = shapePlan(plan, 'timed', 'push', 40);
    expect(t.plan.find((x) => x.exerciseId === 'nordicNeg')!.workSec).toBeUndefined();
    expect(t.plan.find((x) => x.exerciseId === 'pushup')!.workSec).toBe(45);
    expect(t.notes.join(' ')).toContain('Nordic');
  });
  it('Zirkel: Stationen wechseln Unter-/Oberkörper, Runden passen in die Zeit', () => {
    const c = shapePlan(plan, 'circuit', 'push', 20);
    expect(c.format).toBe('circuit');
    expect(c.plan.length).toBe(4);
    expect(c.plan.some((x) => x.exerciseId === 'nordicNeg')).toBe(false);
    const halves = c.plan.map((x) => PATTERN_BY_ID[x.pattern].half);
    for (let i = 1; i < halves.length; i++) expect(halves[i]).not.toBe(halves[i - 1]);
    expect(estimateShaped(c.plan, c.circuit)).toBeLessThanOrEqual(22);
    expect(circuitSpec(10, 3).rounds).toBe(2);
    expect(circuitSpec(45, 6).rounds).toBeGreaterThanOrEqual(4);
  });
  it('Locker: Reserve 3, keine Kalibrierung/Intensivierung', () => {
    const e = shapePlan([{ ...pe('squat', 'gobletSquat'), calibrationLastSet: true, technique: 'restPause' }], 'timed', 'easy', 30);
    expect(e.plan[0]).toMatchObject({ minRir: 3, calibrationLastSet: false, technique: undefined });
  });
});

describe('Rekorde', () => {
  const done = (reps: number, workSec?: number, estimated?: boolean): StrengthSession => ({
    id: Math.random().toString(), profileId: 'p', kind: 'strength', status: 'done', startedAt: '', plannedMinutes: 30, plan: [],
    sets: [{ pattern: 'hPush', exerciseId: 'pushup', reps, rir: 1, at: '', workSec, estimated }]
  });
  it('nur echte Verbesserungen, getrennt nach Zeit-Satz und klassisch', () => {
    const now = [{ pattern: 'hPush' as const, exerciseId: 'pushup', reps: 21, rir: 1, at: '', workSec: 45 }];
    expect(newRecords(now, [done(20, 45)])).toHaveLength(1);
    expect(newRecords(now, [done(25)])).toHaveLength(0); // erster Zeit-Satz ist kein Rekord
    expect(newRecords(now, [done(22, 45)])).toHaveLength(0);
    expect(newRecords([{ ...now[0]!, estimated: true }], [done(10, 45)])).toHaveLength(0);
  });
});

describe('Einheit starten, verlängern, bewerten', () => {
  it('Nur 10 Minuten: Zirkel, danach Verlängerung mit neuen Mustern', async () => {
    const d = new CoachDB(`fmt-${Math.random()}`);
    const prof = p();
    await d.profiles.put(prof);
    const s = await startSession(prof, 10, d, { mood: 'short', quick: true });
    expect(s.format).toBe('circuit');
    expect(s.plan.length).toBe(3);
    expect(s.circuit!.rounds).toBe(2);
    const ext = await extendSession(prof, s, 10, d);
    expect(ext).not.toBeNull();
    expect(ext!.plan.length).toBeGreaterThan(3);
    expect(new Set(ext!.plan.map((x) => x.pattern)).size).toBe(ext!.plan.length);
    expect(ext!.plan.at(-1)!.block).toBe(1);
  });
  it('planStrength zeigt den Grund und respektiert die Wahl', async () => {
    const d = new CoachDB(`fmt-${Math.random()}`);
    const prof = { ...p(), motivation: 'quick' as const };
    await d.profiles.put(prof);
    const a = await planStrength(prof, 30, {}, d, null);
    expect(a.format).not.toBe('classic');
    expect(a.why[0]).toContain('Kurz und fertig');
    const b = await planStrength(prof, 30, { format: 'classic' }, d, null);
    expect(b.format).toBe('classic');
    expect(b.auto).toBe(a.format);
  });
  it('Daumen runter tauscht gegen eine Alternative', async () => {
    const d = new CoachDB(`fmt-${Math.random()}`);
    const prof = p();
    await d.profiles.put(prof);
    const s = await startSession(prof, 40, d, { format: 'classic' });
    const x = s.plan.find((y) => EXERCISE_BY_ID[y.exerciseId] && y.pattern === 'hPush') ?? s.plan[0]!;
    const c = await rateExercise(prof, x.pattern, x.exerciseId, -1, d);
    expect((await getRatings(prof.id, d))[x.exerciseId]).toBe(-1);
    if (c) expect(c.what).toContain('→');
  });
});

describe('Progression nach Zirkel', () => {
  it('Zirkel-Sätze verändern Stufen nur bei > 30 Wdh.', async () => {
    const { finishSession, ensureStates } = await import('./training');
    const d = new CoachDB(`fmt-${Math.random()}`);
    const prof = p();
    await d.profiles.put(prof);
    const s = await startSession(prof, 20, d, { format: 'circuit' });
    const x = s.plan[0]!;
    const before = (await ensureStates(prof, d)).find((y) => y.pattern === x.pattern)!;
    const low = { ...s, sets: [1, 2].map(() => ({ pattern: x.pattern, exerciseId: x.exerciseId, bandLevel: x.bandLevel, reps: 3, rir: 2, workSec: 40, at: new Date().toISOString() })) };
    expect(await finishSession(prof, low, { sRpe: 6, enjoyment: 4, pain: [] }, d)).toHaveLength(0);
    const after = (await ensureStates(prof, d)).find((y) => y.pattern === x.pattern)!;
    expect(after.step).toEqual(before.step);
  });
});
