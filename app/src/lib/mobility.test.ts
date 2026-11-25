import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CoachDB } from './db';
import { newProfile } from './defaults';
import { animId, DEFAULT_EVENING, DEFAULT_MORNING, defaultSetup, MOBILITY, routineCatalog, routineForToday, routineSeconds, routineSequence, routineSetup, stepKey } from './mobility';
import { MOTIONS } from './motions';
import { getRoutineLog, newRoutineLog, resumeIndex, routineDays, saveRoutineLog } from './routineStore';

describe('Morgenroutine (M8)', () => {
  it('jede Mobility-Übung hat eine Animation und steht im Gesamtkatalog', () => {
    for (const m of MOBILITY) {
      expect(MOTIONS[animId(m.id)], m.id).toBeDefined();
    }
  });
  it('Standard: 8 Übungen, 8–12 Minuten, keine Rumpfbeuge', () => {
    expect(DEFAULT_MORNING).toHaveLength(8);
    const min = routineSeconds(DEFAULT_MORNING) / 60;
    expect(min).toBeGreaterThanOrEqual(8);
    expect(min).toBeLessThanOrEqual(12);
  });
  it('eigene Auswahl bleibt erhalten, unbekannte IDs fallen weg', () => {
    const p = newProfile();
    expect(routineSetup(p, 'morning').items).toEqual(DEFAULT_MORNING);
    p.routines = { morning: { items: [{ id: 'mobCatCow', sec: 60 }, { id: 'gibtsNicht', sec: 30 }], autoStart: false } };
    expect(routineSetup(p, 'morning')).toEqual({ items: [{ id: 'mobCatCow', sec: 60 }], autoStart: false });
    expect(routineSetup(p, 'evening')).toEqual(defaultSetup('evening'));
  });
  it('Tagesform: Rot → sanfter (gleiche Übungen, kürzer), Warnzeichen → keine Routine', () => {
    const green = routineForToday(defaultSetup('morning'), { light: 'green', hardStop: false, noTraining: false });
    expect(green.items).toEqual(DEFAULT_MORNING);
    expect(green.gentle).toBe(false);
    const red = routineForToday(defaultSetup('morning'), { light: 'red', hardStop: false, noTraining: false });
    expect(red.gentle).toBe(true);
    expect(red.items.map((x) => x.id)).toEqual(DEFAULT_MORNING.map((x) => x.id));
    expect(routineSeconds(red.items)).toBeLessThan(routineSeconds(DEFAULT_MORNING));
    const sick = routineForToday(defaultSetup('morning'), { light: 'red', hardStop: false, noTraining: true });
    expect(sick.autoStartOk).toBe(false);
    expect(routineForToday(defaultSetup('morning'), { light: 'red', hardStop: true, noTraining: true }).blocked).toBe(true);
    expect(routineForToday(defaultSetup('morning'), null).autoStartOk).toBe(true);
  });
  it('Protokoll: speichern, fortsetzen, Wochenpunkte', async () => {
    const d = new CoachDB('routine-test');
    const l = newRoutineLog('p1', 'morning', DEFAULT_MORNING, false, '2026-11-25');
    l.done.push(DEFAULT_MORNING[0]!.id);
    l.skipped.push(DEFAULT_MORNING[1]!.id);
    await saveRoutineLog(l, d);
    const back = await getRoutineLog('p1', 'morning', '2026-11-25', d);
    expect(back && resumeIndex(back)).toBe(2);
    await saveRoutineLog({ ...l, status: 'done' }, d);
    const days = await routineDays('p1', 'morning', 3, new Date('2026-11-25T12:00:00'), d);
    expect(days.map((x) => x.status)).toEqual(['none', 'none', 'done']);
  });
});

describe('Abendroutine (M8)', () => {
  it('Standard: 5 Kraftübungen × 2 Runden, Push/Pull/Beine/Hüfte/Rumpf, ca. 10 min', () => {
    expect(DEFAULT_EVENING.map((x) => x.id)).toEqual(['rtPushup', 'rtBandRow', 'rtGobletSquat', 'rtBridge', 'rtPlank']);
    const s = defaultSetup('evening');
    const seq = routineSequence(s.items, s.rounds);
    expect(seq).toHaveLength(10);
    expect(new Set(seq.map(stepKey)).size).toBe(10);
    const min = routineSeconds(seq, s.restSec) / 60;
    expect(min).toBeGreaterThanOrEqual(9);
    expect(min).toBeLessThanOrEqual(11);
  });
  it('morgens nur Mobility wählbar, abends auch die Kraftübungen', () => {
    expect(routineCatalog('morning').some((m) => m.strength)).toBe(false);
    expect(routineCatalog('evening').filter((m) => m.strength).length).toBeGreaterThanOrEqual(5);
  });
  it('rote Ampel: nur 1 Runde, Arbeitszeit bleibt', () => {
    const r = routineForToday(defaultSetup('evening'), { light: 'red', hardStop: false, noTraining: false });
    expect(r.gentle).toBe(true);
    expect(r.items).toHaveLength(5);
    expect(r.items[0]!.sec).toBe(40);
    expect(r.restSec).toBe(20);
  });
});
