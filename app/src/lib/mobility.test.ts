import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { CoachDB } from './db';
import { newProfile } from './defaults';
import { DEFAULT_MORNING, MOBILITY, MOBILITY_MOTIONS, routineForToday, routineSeconds, routineSetup } from './mobility';
import { MOTIONS } from './motions';
import { getRoutineLog, newRoutineLog, resumeIndex, routineDays, saveRoutineLog } from './routineStore';

describe('Morgenroutine (M8)', () => {
  it('jede Mobility-Übung hat eine Animation und steht im Gesamtkatalog', () => {
    for (const m of MOBILITY) {
      expect(MOBILITY_MOTIONS[m.id], m.id).toBeDefined();
      expect(MOTIONS[m.id], m.id).toBeDefined();
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
  });
  it('Tagesform: Rot → sanfter (gleiche Übungen, kürzer), Warnzeichen → keine Routine', () => {
    const green = routineForToday(DEFAULT_MORNING, { light: 'green', hardStop: false, noTraining: false });
    expect(green.items).toEqual(DEFAULT_MORNING);
    expect(green.gentle).toBe(false);
    const red = routineForToday(DEFAULT_MORNING, { light: 'red', hardStop: false, noTraining: false });
    expect(red.gentle).toBe(true);
    expect(red.items.map((x) => x.id)).toEqual(DEFAULT_MORNING.map((x) => x.id));
    expect(routineSeconds(red.items)).toBeLessThan(routineSeconds(DEFAULT_MORNING));
    const sick = routineForToday(DEFAULT_MORNING, { light: 'red', hardStop: false, noTraining: true });
    expect(sick.autoStartOk).toBe(false);
    expect(routineForToday(DEFAULT_MORNING, { light: 'red', hardStop: true, noTraining: true }).blocked).toBe(true);
    expect(routineForToday(DEFAULT_MORNING, null).autoStartOk).toBe(true);
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
