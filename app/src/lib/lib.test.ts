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
