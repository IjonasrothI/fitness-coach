import Dexie, { type EntityTable } from 'dexie';
import type {
  ChangeLogEntry, EnduranceSession, EnduranceTest, ExerciseFeedback, Meta, PatternState, Profile,
  StrengthSession, WeightEntry
} from './types';

export class CoachDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  weights!: EntityTable<WeightEntry, 'id'>;
  changes!: EntityTable<ChangeLogEntry, 'id'>;
  meta!: EntityTable<Meta, 'key'>;
  patternStates!: EntityTable<PatternState, 'id'>;
  sessions!: EntityTable<StrengthSession, 'id'>;
  feedback!: EntityTable<ExerciseFeedback, 'id'>;
  endurance!: EntityTable<EnduranceSession, 'id'>;
  tests!: EntityTable<EnduranceTest, 'id'>;

  constructor(name = 'fitness-coach') {
    super(name);
    this.version(1).stores({
      profiles: 'id, name',
      weights: '++id, profileId, [profileId+date]',
      changes: '++id, profileId, at',
      meta: 'key'
    });
    this.version(2).stores({
      patternStates: 'id, profileId',
      sessions: 'id, profileId, status, startedAt',
      feedback: '++id, profileId'
    });
    this.version(3).stores({
      endurance: 'id, profileId, date',
      tests: 'id, profileId, kind, date'
    });
  }
}

export const db = new CoachDB();

export async function getMeta<T>(key: string, fallback: T, d: CoachDB = db): Promise<T> {
  const row = await d.meta.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setMeta(key: string, value: unknown, d: CoachDB = db): Promise<void> {
  await d.meta.put({ key, value: plain(value) });
}

/** Speichert ein Profil und protokolliert das Gewicht, falls es sich geändert hat. */
export async function saveProfile(p: Profile, d: CoachDB = db): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const updated: Profile = { ...plain(p), updatedAt: new Date().toISOString() };
  await d.transaction('rw', d.profiles, d.weights, async () => {
    const before = await d.profiles.get(p.id);
    await d.profiles.put(updated);
    if (!before || before.weightKg !== p.weightKg) {
      const existing = await d.weights.where('[profileId+date]').equals([p.id, today]).first();
      if (existing?.id !== undefined) await d.weights.update(existing.id, { kg: p.weightKg });
      else await d.weights.add({ profileId: p.id, date: today, kg: p.weightKg });
    }
  });
}

export async function deleteProfile(id: string, d: CoachDB = db): Promise<void> {
  const tables = [d.profiles, d.weights, d.changes, d.patternStates, d.sessions, d.feedback, d.endurance, d.tests];
  await d.transaction('rw', tables, async () => {
    await d.profiles.delete(id);
    for (const t of tables.slice(1)) await t.where('profileId').equals(id).delete();
  });
}

/** Entfernt Svelte-Proxies, damit IndexedDB klonen kann. */
export function plain<T>(v: T): T {
  return v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T);
}
