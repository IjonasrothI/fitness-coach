import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { newProfile } from './defaults';
import { ageGroup, clearance, deloadEveryWeeks, intenseAllowed, maxHr, rescreenDue, validateProfile } from './derive';
import { CoachDB, saveProfile, setMeta } from './db';
import { backupDue, BackupError, createBackup, parseBackup, restoreBackup } from './backup';

const D2026 = new Date('2026-11-23T12:00:00Z');

function profile(overrides: Partial<ReturnType<typeof newProfile>> = {}) {
  return { ...newProfile(), name: 'Test', ...overrides };
}

describe('maxHr (E3)', () => {
  it('nutzt Tanaka, nicht 220 − Alter', () => {
    const p = profile({ birthYear: 1986 }); // 40 Jahre
    expect(maxHr(p, D2026)).toEqual({ value: 180, source: 'tanaka', uncertainty: 10 });
  });
  it('gemessener Wert schlägt Formel', () => {
    const p = profile();
    p.endurance.maxHrMeasured = 191;
    expect(maxHr(p, D2026)).toEqual({ value: 191, source: 'measured', uncertainty: 0 });
  });
});

describe('clearance (F25)', () => {
  it('alles nein → frei', () => {
    expect(clearance(profile()).status).toBe('clear');
  });
  it('Brustschmerz → gesperrt bis Freigabe', () => {
    const p = profile();
    p.health.parq.chestPain = true;
    expect(clearance(p).status).toBe('restricted');
    expect(intenseAllowed(p)).toBe(false);
    p.health.medicalClearanceAt = '2026-11-01';
    expect(clearance(p).status).toBe('cleared');
    expect(intenseAllowed(p)).toBe(true);
  });
  it('nur Gelenkproblem → regional, keine globale Sperre', () => {
    const p = profile();
    p.health.parq.boneJoint = true;
    expect(clearance(p).status).toBe('regional');
    expect(intenseAllowed(p)).toBe(true);
  });
  it('Re-Screening nach einem Jahr fällig', () => {
    const p = profile();
    p.health.screenedAt = '2025-11-01T00:00:00Z';
    expect(rescreenDue(p, D2026)).toBe(true);
    p.health.screenedAt = '2026-06-01T00:00:00Z';
    expect(rescreenDue(p, D2026)).toBe(false);
  });
});

describe('Altersregeln (F13, F30)', () => {
  it('Deload-Rhythmus nach Alter', () => {
    expect(ageGroup(1995, D2026)).toBe('under40');
    expect(deloadEveryWeeks(1995, D2026)).toEqual([5, 7]);
    expect(deloadEveryWeeks(1980, D2026)).toEqual([5, 6]);
    expect(deloadEveryWeeks(1960, D2026)).toEqual([4, 5]);
  });
});

describe('validateProfile', () => {
  it('meldet fehlenden Namen und unplausible Werte', () => {
    const p = profile({ name: ' ', heightCm: 90 });
    p.availability.days = [];
    const errs = validateProfile(p);
    expect(errs).toContain('Name fehlt.');
    expect(errs.some((e) => e.startsWith('Größe'))).toBe(true);
    expect(errs.some((e) => e.startsWith('Mindestens einen Trainingstag'))).toBe(true);
  });
  it('Standardprofil mit Namen ist gültig', () => {
    expect(validateProfile(profile())).toEqual([]);
  });
});

describe('Datenbank + Sicherung', () => {
  it('protokolliert Gewicht nur bei Änderung, ein Eintrag pro Tag', async () => {
    const d = new CoachDB('t-weight-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    await saveProfile(p, d);
    expect(await d.weights.count()).toBe(1);
    await saveProfile({ ...p, weightKg: 74 }, d);
    const all = await d.weights.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]?.kg).toBe(74);
  });

  it('Export → Import ergibt identische Daten', async () => {
    const a = new CoachDB('t-a-' + Math.random());
    const p = profile();
    await saveProfile(p, a);
    await setMeta('activeProfileId', p.id, a);
    const json = JSON.stringify(await createBackup(a));

    const b = new CoachDB('t-b-' + Math.random());
    await saveProfile(profile({ name: 'Wird überschrieben' }), b);
    await restoreBackup(parseBackup(json), b);
    const profiles = await b.profiles.toArray();
    expect(profiles).toHaveLength(1);
    expect(profiles[0]?.id).toBe(p.id);
    expect((await b.meta.get('activeProfileId'))?.value).toBe(p.id);
  });

  it('lehnt fremde, kaputte und zu neue Dateien ab', () => {
    expect(() => parseBackup('kein json')).toThrow(BackupError);
    expect(() => parseBackup('{"format":"anders"}')).toThrow('keine Sicherung');
    expect(() => parseBackup(JSON.stringify({ format: 'fitness-coach-backup', version: 99, profiles: [], weights: [], changes: [] })))
      .toThrow('neueren');
  });

  it('Sicherungs-Erinnerung nach 14 Tagen', () => {
    expect(backupDue(null, D2026)).toBe(true);
    expect(backupDue('2026-11-15T00:00:00Z', D2026)).toBe(false);
    expect(backupDue('2026-11-01T00:00:00Z', D2026)).toBe(true);
  });
});

describe('Training-Service (DB)', async () => {
  const { ensureStates, startSession, finishSession, giveFeedback, undoChange, getRirOffset } = await import('./training');
  it('Einheit starten, Sätze loggen, abschließen → Progression + Protokoll + Rückgängig', async () => {
    const d = new CoachDB('t-train-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    const states = await ensureStates(p, d);
    expect(states.length).toBe(12);
    const s = await startSession(p, 30, d);
    expect(s.plan.length).toBeGreaterThan(0);
    const first = s.plan[0]!;
    // alle Sätze weit über 30 Wdh. → Zwangswechsel
    for (let i = 0; i < first.sets; i++) {
      s.sets.push({ pattern: first.pattern, exerciseId: first.exerciseId, bandLevel: first.bandLevel, reps: 35, rir: 2, at: new Date().toISOString() });
    }
    const changes = await finishSession(p, s, { sRpe: 7, enjoyment: 4, pain: [] }, d);
    expect(changes.length).toBe(1);
    expect((await d.sessions.get(s.id))?.status).toBe('done');
    const after = await d.patternStates.get(`${p.id}:${first.pattern}`);
    expect(after?.step).not.toEqual({ exerciseId: first.exerciseId, bandLevel: first.bandLevel });
    expect(await undoChange(changes[0]!.id!, d)).toBe(true);
    const restored = await d.patternStates.get(`${p.id}:${first.pattern}`);
    expect(restored?.step.exerciseId).toBe(first.exerciseId);
    expect(await undoChange(changes[0]!.id!, d)).toBe(false); // nicht doppelt
  });

  it('Kalibrierungssatz aktualisiert den RIR-Offset', async () => {
    const d = new CoachDB('t-cal-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    const s = await startSession(p, 45, d);
    const x = s.plan[0]!;
    s.sets.push({ pattern: x.pattern, exerciseId: x.exerciseId, bandLevel: x.bandLevel, reps: 12, rir: 2,
      calibration: { stopReps: 12, estRir: 2, totalReps: 17 }, at: new Date().toISOString() });
    await finishSession(p, s, { sRpe: 8, enjoyment: 3, pain: [] }, d);
    expect(await getRirOffset(p.id, d)).toBe(1.2);
  });

  it('Rückmeldung tauscht Übung und wird gespeichert', async () => {
    const d = new CoachDB('t-fb-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    await ensureStates(p, d);
    const r = await giveFeedback(p, 'vPull', 'anchor', 'Tür zu dünn', d);
    expect(r?.state.blocked.length).toBe(1);
    expect(await d.feedback.count()).toBe(1);
  });

  it('Sicherung v2 enthält Trainingsdaten', async () => {
    const d = new CoachDB('t-bk2-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    await ensureStates(p, d);
    const b = await createBackup(d);
    expect(b.version).toBe(6);
    expect(b.patternStates?.length).toBe(12);
    const e = new CoachDB('t-bk2r-' + Math.random());
    await restoreBackup(parseBackup(JSON.stringify(b)), e);
    expect(await e.patternStates.count()).toBe(12);
  });
});

describe('Tagesform in der Kraftplanung (M4)', async () => {
  const { planSession, startSession, finishSession } = await import('./training');
  const { saveCheckIn } = await import('./checkinStore');
  const { todayKey } = await import('./readiness');
  const base = (pid: string, o: Record<string, unknown> = {}) => ({
    id: `${pid}:${todayKey()}`, profileId: pid, date: todayKey(), at: new Date().toISOString(), sleepH: 7.5, sleepQ: 3,
    energy: 3, soreness: 3, sorenessRegions: [], stress: 3, motivation: 3, pain: [], sick: false, warning: [], ...o
  });

  it('gelb → Mindest-Reserve 2, keine Kalibrierung', async () => {
    const d = new CoachDB('t-ready-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    await saveCheckIn(base(p.id, { energy: 2, soreness: 4, stress: 4, motivation: 2, sleepQ: 2 }) as never, d);
    const plan = await planSession(p, 45, d);
    expect(plan.every((x) => x.minRir === 2)).toBe(true);
    expect(plan.some((x) => x.calibrationLastSet)).toBe(false);
  });

  it('Knieschmerz > 5 → keine Kniebeugen heute', async () => {
    const d = new CoachDB('t-pain-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    await saveCheckIn(base(p.id, { pain: [{ region: 'knee', score: 7 }] }) as never, d);
    const plan = await planSession(p, 60, d);
    expect(plan.some((x) => x.pattern === 'squat')).toBe(false);
  });

  it('gedeckelte Einheit löst keinen Stufenwechsel aus', async () => {
    const d = new CoachDB('t-cap-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    await saveCheckIn(base(p.id, { energy: 2, soreness: 4, stress: 4, motivation: 2, sleepQ: 2 }) as never, d);
    const s = await startSession(p, 30, d);
    const x = s.plan[0]!;
    for (let i = 0; i < x.sets; i++) s.sets.push({ pattern: x.pattern, exerciseId: x.exerciseId, bandLevel: x.bandLevel, reps: 40, rir: 4, at: new Date().toISOString() });
    expect(await finishSession(p, s, { sRpe: 4, enjoyment: 3, pain: [] }, d)).toHaveLength(0);
  });
});

describe('Wochenplan (M5)', async () => {
  const ws = await import('./weekStore');
  const { mondayOf, addDays } = await import('./planner');
  const { todayKey } = await import('./readiness');
  const { planSession } = await import('./training');

  it('Woche wird angelegt, Zeitänderung verteilt neu', async () => {
    const d = new CoachDB('t-week-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    const w = await ws.getWeek(p, undefined, d);
    expect(w.days).toHaveLength(7);
    expect(w.deload).toBe(false);
    const future = w.days.find((x) => x.date > todayKey() && x.items.length);
    if (future) {
      const w2 = await ws.setAvailability(p, w, future.date, 0, d);
      expect(w2.days.find((x) => x.date === future.date)!.items).toHaveLength(0);
    }
  });

  it('nach 5 Wochen im Block → Entlastungswoche, Kraft mit halben Sätzen; Rückgängig hebt sie auf', async () => {
    const d = new CoachDB('t-deload-' + Math.random());
    const p = { ...profile(), createdAt: new Date(Date.now() - 40 * 86400000).toISOString() };
    await saveProfile(p, d);
    await setMeta(`blockStart:${p.id}`, addDays(mondayOf(todayKey()), -28), d); // aktuelle Woche = Blockwoche 5
    const w = await ws.getWeek(p, undefined, d);
    expect(w.blockWeek).toBe(5);
    expect(w.deload).toBe(true);
    const plan = await planSession(p, 45, d);
    expect(plan.every((x) => x.deload && x.minRir === 3)).toBe(true);
    const changes = await ws.weekChanges(p.id, d);
    expect(await ws.undoWeekChange(p, changes[0]!, d)).toBe(true);
    expect((await d.weeks.get(w.id))!.deload).toBe(false);
  });

  it('nach einer Entlastungswoche beginnt ein neuer Block', async () => {
    const d = new CoachDB('t-block-' + Math.random());
    const p = profile();
    await saveProfile(p, d);
    const thisWeek = mondayOf(todayKey());
    await d.weeks.put({ id: `${p.id}:${addDays(thisWeek, -7)}`, profileId: p.id, weekStart: addDays(thisWeek, -7), days: [], deload: true, blockWeek: 5, why: [], createdAt: '', updatedAt: '' });
    const w = await ws.getWeek(p, undefined, d);
    expect(w.blockWeek).toBe(1);
  });
});
