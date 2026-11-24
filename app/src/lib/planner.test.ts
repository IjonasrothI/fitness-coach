import { describe, expect, it } from 'vitest';
import { newProfile } from './defaults';
import {
  addDays, deloadDecision, defaultAvailability, enduranceTypes, fatigueSignals, itemStatus, learnAvailability,
  mondayOf, planWeek, spreadDays, strengthTarget, weekMinutes
} from './planner';
import type { Profile, StrengthSession } from './types';

const MON = '2026-11-23'; // Montag
function profile(mod?: (p: Profile) => void): Profile {
  const p = { ...newProfile(), name: 'T', birthYear: 1990 };
  mod?.(p);
  return p;
}
const NOW = new Date('2026-11-23T08:00:00');

describe('Datum', () => {
  it('Montag der Woche', () => {
    expect(mondayOf('2026-11-26')).toBe(MON);
    expect(mondayOf('2026-11-29')).toBe(MON); // Sonntag
    expect(mondayOf(MON)).toBe(MON);
    expect(addDays(MON, 6)).toBe('2026-11-29');
  });
});

describe('Verteilung', () => {
  it('Kraft-Tage mit maximalem Abstand', () => {
    expect(spreadDays([0, 1, 2, 3, 4, 5, 6], 3)).toEqual([0, 2, 4]);
    expect(spreadDays([0, 2, 4, 5], 2)).toEqual([0, 4]);
  });
  it('Anzahl Kraft-Einheiten nach Schwerpunkt', () => {
    expect(strengthTarget(profile((p) => (p.goals.focus = 20)), 5)).toBe(3);
    expect(strengthTarget(profile((p) => (p.goals.focus = 80)), 5)).toBe(2);
    expect(strengthTarget(profile((p) => (p.goals.focus = 50)), 1)).toBe(1);
  });
  it('Ausdauertypen pyramidal; Deload nur locker', () => {
    expect(enduranceTypes(4, false)).toEqual(['intervals', 'tempo', 'long', 'easy']);
    expect(enduranceTypes(3, true)).toEqual(['easy', 'easy', 'easy']);
  });
});

describe('planWeek', () => {
  const p = profile((x) => { x.goals.focus = 50; x.goals.areas = ['running', 'health']; });
  const avail = [45, 0, 45, 45, 0, 90, 40]; // Mo Mi Do Sa So

  it('alle verfügbaren Tage belegt, Kraft ≥ 2×, lange Einheit am längsten Tag', () => {
    const { days } = planWeek(p, avail, { weekStart: MON, deload: false });
    const items = days.flatMap((d) => d.items);
    expect(items.length).toBe(5);
    expect(items.filter((x) => x.kind === 'strength').length).toBe(3); // ausgewogen + 5 Tage → 3× (K4)
    expect(days[5]!.items[0]).toMatchObject({ kind: 'endurance', type: 'long' });
    expect(days[1]!.items).toHaveLength(0);
  });
  it('Intervalle nicht am Tag nach Kraft (E18), auch bei voller Woche', () => {
    for (const a of [[45, 45, 45, 45, 45, 90, 45], [45, 0, 45, 45, 0, 90, 40], [60, 60, 0, 60, 60, 120, 0]]) {
      const { days } = planWeek(p, a, { weekStart: MON, deload: false });
      const i = days.findIndex((d) => d.items.some((x) => x.type === 'intervals'));
      expect(i).toBeGreaterThanOrEqual(0);
      if (i > 0) expect(days[i - 1]!.items.some((x) => x.kind === 'strength')).toBe(false);
    }
  });
  it('Minuten passen in die verfügbare Zeit', () => {
    const { days } = planWeek(p, avail, { weekStart: MON, deload: false });
    for (const d of days) expect(d.items.reduce((t, x) => t + x.minutes, 0)).toBeLessThanOrEqual(Math.max(d.availableMin, 20));
  });
  it('Deload: Ausdauer kürzer und nur locker', () => {
    const normal = weekMinutes(planWeek(p, avail, { weekStart: MON, deload: false }).days);
    const { days } = planWeek(p, avail, { weekStart: MON, deload: true });
    expect(days.flatMap((d) => d.items).every((x) => x.kind === 'strength' || x.type === 'easy')).toBe(true);
    expect(weekMinutes(days).endurance).toBeLessThan(normal.endurance);
  });
  it('Neuplanung behält vergangene und vom Nutzer bearbeitete Tage', () => {
    const first = planWeek(p, avail, { weekStart: MON, deload: false }).days;
    first[6]!.items = [{ id: 'u', kind: 'strength', minutes: 30, userEdited: true }];
    const re = planWeek(p, [45, 0, 0, 0, 0, 90, 40], { weekStart: MON, deload: false, fromDate: '2026-11-25', keep: first });
    expect(re.days[0]!.items).toEqual(first[0]!.items); // Montag liegt vor fromDate
    expect(re.days[2]!.items).toHaveLength(0); // Mittwoch jetzt frei
    expect(re.days[6]!.items[0]!.id).toBe('u');
  });
  it('Winter: Rad auf der Rolle', () => {
    const bikeOnly = profile((x) => { x.endurance.runOutdoor = false; });
    const { days } = planWeek(bikeOnly, avail, { weekStart: MON, deload: false });
    const sports = days.flatMap((d) => d.items).filter((x) => x.kind === 'endurance').map((x) => x.sport);
    expect(new Set(sports)).toEqual(new Set(['bikeIndoor']));
  });
  it('Standardwoche aus Profil', () => {
    expect(defaultAvailability(profile())).toEqual([40, 0, 40, 0, 40, 40, 0]);
  });
});

describe('Deload (F13–F15)', () => {
  const p = profile();
  it('geplant ab Woche 5 (unter 40)', () => {
    expect(deloadDecision(p, 4, [], 0.5, NOW).deload).toBe(false);
    expect(deloadDecision(p, 5, [], 0.5, NOW).deload).toBe(true);
  });
  it('aufgeschoben bei sehr guter Form, Limit 10 Wochen', () => {
    expect(deloadDecision(p, 5, [], 0.9, NOW).deload).toBe(false);
    expect(deloadDecision(p, 9, [], 0.9, NOW).deload).toBe(true);
    expect(deloadDecision(p, 10, [], 1, NOW).deload).toBe(true);
  });
  it('vorgezogen bei ≥ 2 Ermüdungssignalen', () => {
    expect(deloadDecision(p, 3, ['a', 'b'], 0.2, NOW).deload).toBe(true);
    expect(deloadDecision(p, 3, ['a'], 0.2, NOW).deload).toBe(false);
  });
  it('Ermüdungssignale', () => {
    const s = fatigueSignals({ lights: ['yellow', 'red', 'yellow', 'yellow', 'green', 'green', 'green'], strength: [], endurance: [], checkins: [] });
    expect(s).toHaveLength(1);
  });
});

describe('Status & Lernen', () => {
  it('erledigt, verpasst, heute', () => {
    const item = { id: 'a', kind: 'strength' as const, minutes: 40 };
    const done: StrengthSession = { id: 's', profileId: 'p', kind: 'strength', status: 'done', startedAt: '2026-11-23T10:00:00', plannedMinutes: 40, plan: [], sets: [] };
    expect(itemStatus(item, '2026-11-23', '2026-11-24', [done], [], [item])).toBe('done');
    expect(itemStatus(item, '2026-11-22', '2026-11-24', [], [], [item])).toBe('missed');
    expect(itemStatus(item, '2026-11-24', '2026-11-24', [], [], [item])).toBe('today');
  });
  it('Tag fällt meist aus → frei; Einheiten kürzer → weniger Minuten', () => {
    const base = [40, 0, 40, 0, 40, 60, 0];
    const w = (done: number[]) => ({ planned: base, done });
    const r = learnAvailability(base, [w([40, 0, 0, 0, 25, 60, 0]), w([35, 0, 0, 0, 25, 60, 0]), w([40, 0, 0, 0, 30, 60, 0]), w([40, 0, 40, 0, 25, 55, 0])])!;
    expect(r.avail[2]).toBe(0);
    expect(r.avail[4]).toBe(25);
    expect(r.avail[0]).toBe(40);
    expect(r.changes).toHaveLength(2);
  });
  it('zu wenig Daten → nichts lernen', () => {
    expect(learnAvailability([40, 0, 0, 0, 0, 0, 0], [])).toBeNull();
  });
});

describe('Flexible Einheitsdauer', () => {
  it('variiert innerhalb der verfügbaren Zeit, nie darüber, mind. 20 min', async () => {
    const { varyMinutes } = await import('./planner');
    const vals = [0, 1, 2, 3, 4, 5].map((k) => varyMinutes(40, '2026-11-23', k, 'easy'));
    expect(new Set(vals).size).toBeGreaterThan(1);
    expect(Math.max(...vals)).toBeLessThanOrEqual(40);
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(30);
    expect(varyMinutes(20, '2026-11-23', 1, 'strength')).toBe(20);
    expect(varyMinutes(40, '2026-11-23', 3, 'easy')).toBe(varyMinutes(40, '2026-11-23', 3, 'easy'));
  });
});
