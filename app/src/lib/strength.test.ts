import { describe, expect, it } from 'vitest';
import { newProfile } from './defaults';
import { EXERCISE_BY_ID, EXERCISES, PATTERNS } from './exercises';
import {
  buildSession, calibrationDue, correctedRir, estimateMinutes, initialState, isHardSet, ladder,
  muscleVolume, placementNext, progress, stepIndex, swapAfterFeedback, updateRirOffset
} from './strength';
import type { PatternState, Profile, SetLog, StrengthSession } from './types';

function profile(mod?: (p: Profile) => void): Profile {
  const p = { ...newProfile(), name: 'T' };
  mod?.(p);
  return p;
}

const set = (exerciseId: string, reps: number, rir: number, bandLevel?: number): SetLog => ({
  pattern: EXERCISE_BY_ID[exerciseId]!.pattern, exerciseId, bandLevel, reps, rir, at: '2026-11-23T10:00:00Z'
});

function state(p: Profile, pattern: PatternState['pattern'], exerciseId: string, bandLevel?: number): PatternState {
  return { id: `${p.id}:${pattern}`, profileId: p.id, pattern, step: { exerciseId, bandLevel }, placed: true, history: [], blocked: [] };
}

describe('Katalog', () => {
  it('jede Übung hat gültige Muskeln, Muster und Hinweise', () => {
    const ids = new Set(PATTERNS.map((x) => x.id));
    for (const e of EXERCISES) {
      expect(ids.has(e.pattern)).toBe(true);
      expect(Object.keys(e.muscles).length).toBeGreaterThan(0);
      expect(e.cues.length).toBeGreaterThan(0);
    }
  });
  it('mit Standard-Equipment hat jedes Muster mindestens 2 Stufen', () => {
    const p = profile();
    for (const pat of PATTERNS) expect(ladder(pat.id, p).length, pat.id).toBeGreaterThanOrEqual(2);
  });
});

describe('Leitern & Verfügbarkeit', () => {
  it('Bandübungen erzeugen eine Stufe pro Band', () => {
    const p = profile();
    const steps = ladder('hPull', p).filter((s) => s.exerciseId === 'bandRowSeated');
    expect(steps.map((s) => s.bandLevel)).toEqual([1, 2, 3, 4]);
  });
  it('ohne Tisch kein Tisch-Rudern, mit Tisch schon', () => {
    expect(ladder('hPull', profile()).some((s) => s.exerciseId === 'tableRow')).toBe(false);
    expect(ladder('hPull', profile((p) => (p.equipment.anchors.table = true))).some((s) => s.exerciseId === 'tableRow')).toBe(true);
  });
  it('aktuelle Kniebeschwerden schließen Kniebeugen aus', () => {
    const p = profile((x) => x.health.injuries.push({ region: 'knee', note: '', current: true }));
    expect(ladder('squat', p)).toHaveLength(0);
    const old = profile((x) => x.health.injuries.push({ region: 'knee', note: '', current: false }));
    expect(ladder('squat', old).length).toBeGreaterThan(0);
  });
  it('Startstufe hängt von der Erfahrung ab', () => {
    const beginner = initialState('hPush', profile((p) => (p.experience.strength = 'none')))!;
    const adv = initialState('hPush', profile((p) => (p.experience.strength = 'advanced')))!;
    const steps = ladder('hPush', profile());
    expect(stepIndex(steps, adv.step)).toBeGreaterThan(stepIndex(steps, beginner.step));
  });
});

describe('Einstufung', () => {
  const p = profile();
  const steps = ladder('hPush', p);
  it('> 30 Wdh. → zwei Stufen schwerer', () => {
    const r = placementNext(steps, { exerciseId: 'pushup' }, 35, 0);
    expect(r.done).toBe(false);
    expect(stepIndex(steps, r.step)).toBe(stepIndex(steps, { exerciseId: 'pushup' }) + 2);
  });
  it('im Fenster → fertig', () => {
    expect(placementNext(steps, { exerciseId: 'pushup' }, 15, 0).done).toBe(true);
  });
  it('zu wenig → leichter', () => {
    const r = placementNext(steps, { exerciseId: 'pushup' }, 4, 0);
    expect(r.step.exerciseId).toBe('pushupIncline');
  });
  it('nach 3 Versuchen fertig', () => {
    expect(placementNext(steps, { exerciseId: 'pushup' }, 40, 3).done).toBe(true);
  });
});

describe('RIR (K5, K9)', () => {
  it('Kalibrierung: unterschätzte Reserve erhöht den Offset', () => {
    // geschätzt 2 RIR, tatsächlich 5 weitere Wdh. geschafft → Fehler +3
    expect(updateRirOffset(0, { stopReps: 12, estRir: 2, totalReps: 17 })).toBe(1.2);
    expect(updateRirOffset(1.2, { stopReps: 12, estRir: 2, totalReps: 14 })).toBe(0.7);
  });
  it('harter Satz: RIR ≤ 3, bei > 25 Wdh. RIR ≤ 1', () => {
    expect(isHardSet(12, 3, 0)).toBe(true);
    expect(isHardSet(12, 3, 1)).toBe(false); // korrigiert 4
    expect(isHardSet(28, 2, 0)).toBe(false);
    expect(isHardSet(28, 1, 0)).toBe(true);
    expect(correctedRir(1, -1.5)).toBe(0);
  });
  it('Kalibrierung alle 10 Tage fällig', () => {
    const now = new Date('2026-11-23');
    expect(calibrationDue(null, now)).toBe(true);
    expect(calibrationDue('2026-11-20', now)).toBe(false);
    expect(calibrationDue('2026-11-10', now)).toBe(true);
  });
});

describe('Progression', () => {
  const p = profile();
  it('K10: alle Sätze am oberen Ende → nächste Stufe', () => {
    const s = state(p, 'hPush', 'pushup'); // Fenster 8–25
    const r = progress(s, [set('pushup', 25, 2), set('pushup', 25, 1), set('pushup', 25, 0)], p, 0, '2026-11-23');
    expect(r.change?.ruleId).toBe('K10');
    expect(r.state.step.exerciseId).toBe('pushupDeficit');
  });
  it('K6: über 30 Wdh. → Zwangswechsel', () => {
    const s = state(p, 'hPull', 'bandRowSeated', 1);
    const r = progress(s, [set('bandRowSeated', 34, 2, 1)], p, 0, '2026-11-23');
    expect(r.change?.ruleId).toBe('K6');
    expect(r.state.step).toEqual({ exerciseId: 'bandRowSeated', bandLevel: 2 });
  });
  it('K17: schwerste Stufe und > 30 Wdh. → Unterlast + Intensivierung', () => {
    const steps = ladder('lateral', p);
    const top = steps[steps.length - 1]!;
    const s = state(p, 'lateral', top.exerciseId, top.bandLevel);
    const r = progress(s, [set(top.exerciseId, 35, 2, top.bandLevel)], p, 0, '2026-11-23');
    expect(r.change?.ruleId).toBe('K17');
    expect(r.state.underloaded).toBe(true);
    expect(r.state.technique).toBeDefined();
  });
  it('zu schwer → eine Stufe leichter', () => {
    const s = state(p, 'hPush', 'pushupDeficit');
    const r = progress(s, [set('pushupDeficit', 5, 0)], p, 0, '2026-11-23');
    expect(r.state.step.exerciseId).toBe('pushup');
  });
  it('im Fenster ohne Fortschritt: bleibt, nach 3× Stillstand Intensivierung (K18)', () => {
    let s = state(p, 'hPush', 'pushup');
    for (const d of ['2026-11-01', '2026-11-04', '2026-11-07']) {
      const r = progress(s, [set('pushup', 15, 2), set('pushup', 13, 1)], p, 0, d);
      s = r.state;
      if (d === '2026-11-07') {
        expect(r.change?.ruleId).toBe('K18');
        expect(s.technique).toBe('stretchPause');
      } else {
        expect(r.change).toBeNull();
      }
    }
  });
  it('korrigierte RIR fließt ein: offset macht „leichte" Sätze erkennbar', () => {
    const s = state(p, 'hPush', 'pushup');
    // gemeldet RIR 1, Offset +3 → korrigiert 4 → zu leicht
    const r = progress(s, [set('pushup', 25, 1), set('pushup', 25, 1)], p, 3, '2026-11-23');
    expect(r.change?.ruleId).toBe('K10');
  });
});

describe('Rückmeldung „Klappt nicht"', () => {
  const p = profile();
  it('Anker klappt nicht → Übung ausgeschlossen, Alternative gewählt', () => {
    const s = state(p, 'vPull', 'bandPulldown', 2);
    const r = swapAfterFeedback(s, 'anchor', p)!;
    expect(r.state.blocked).toContain('bandPulldown');
    expect(r.state.step.exerciseId).not.toBe('bandPulldown');
  });
  it('zu leicht → eine Stufe hoch', () => {
    const s = state(p, 'hPush', 'pushup');
    expect(swapAfterFeedback(s, 'tooEasy', p)!.state.step.exerciseId).toBe('pushupDeficit');
  });
  it('keine Alternative → null', () => {
    const lim = profile((x) => {
      x.equipment.anchors = { door: false, table: false, sofa: false, fixedObject: false, stairs: false, chair: false };
    });
    const s = state(lim, 'vPull', 'bandPulldown', 1);
    expect(swapAfterFeedback(s, 'dislike', lim)).toBeNull();
  });
});

describe('Einheit bauen', () => {
  const p = profile();
  const states = PATTERNS.map((x) => initialState(x.id, p)!).filter(Boolean);
  it('passt in die verfügbare Zeit', () => {
    for (const min of [20, 30, 45, 60]) {
      const plan = buildSession(p, states, [], min, { rirOffset: 0, calibrate: false });
      expect(plan.length).toBeGreaterThan(0);
      expect(estimateMinutes(plan)).toBeLessThanOrEqual(min + 1);
    }
  });
  it('Grundübungen zuerst, max. 8 direkte Sätze pro Muskel', () => {
    const plan = buildSession(p, states, [], 60, { rirOffset: 0, calibrate: false });
    const perMuscle: Record<string, number> = {};
    for (const x of plan) {
      for (const [m, w] of Object.entries(EXERCISE_BY_ID[x.exerciseId]!.muscles)) perMuscle[m] = (perMuscle[m] ?? 0) + w * x.sets;
    }
    expect(Math.max(...Object.values(perMuscle))).toBeLessThanOrEqual(8);
  });
  it('bevorzugt Muskeln mit Wochendefizit', () => {
    // Brust diese Woche schon 12 harte Sätze
    const done: StrengthSession = {
      id: 's', profileId: p.id, kind: 'strength', status: 'done', startedAt: '2026-11-22T10:00:00Z',
      plannedMinutes: 60, plan: [], sets: Array.from({ length: 12 }, () => set('pushup', 15, 1))
    };
    done.sets.forEach((x) => (x.at = '2026-11-22T10:00:00Z'));
    const plan = buildSession(p, states, [done], 25, { rirOffset: 0, calibrate: false, now: new Date('2026-11-23T10:00:00Z') });
    expect(plan.some((x) => x.pattern === 'hPush')).toBe(false);
  });
  it('Kalibrierungssatz nur bei sicherer Übung', () => {
    const plan = buildSession(p, states, [], 45, { rirOffset: 0, calibrate: true });
    const cal = plan.filter((x) => x.calibrationLastSet);
    expect(cal).toHaveLength(1);
    expect(EXERCISE_BY_ID[cal[0]!.exerciseId]!.safeToFailure).toBe(true);
  });
  it('Volumen zählt fraktional', () => {
    const s: StrengthSession = {
      id: 'v', profileId: p.id, kind: 'strength', status: 'done', startedAt: '2026-11-23T10:00:00Z',
      plannedMinutes: 30, plan: [], sets: [set('pushup', 12, 2), set('pushup', 12, 5)]
    };
    const v = muscleVolume([s], 0, new Date('2026-11-20'));
    expect(v.chest).toBe(1); // zweiter Satz nicht hart
    expect(v.triceps).toBe(0.5);
  });
});

describe('Rückmeldung an den Leiter-Enden', () => {
  it('zu leicht auf schwerster Stufe → Intensivierung statt Abbruch', () => {
    const p = profile((x) => x.health.injuries.push({ region: 'knee', note: '', current: true }));
    const steps = ladder('hamstring', p);
    const top = steps[steps.length - 1]!;
    const s = state(p, 'hamstring', top.exerciseId, top.bandLevel);
    const r = swapAfterFeedback(s, 'tooEasy', p)!;
    expect(r.change.ruleId).toBe('K17');
    expect(r.state.technique).toBeDefined();
  });
  it('zu schwer auf leichtester Stufe → null', () => {
    const p = profile();
    const first = ladder('hPush', p)[0]!;
    expect(swapAfterFeedback(state(p, 'hPush', first.exerciseId), 'tooHard', p)).toBeNull();
  });
});
