import Dexie, { type EntityTable } from 'dexie';
import type { ChangeLogEntry, Meta, Profile, WeightEntry } from './types';

export class CoachDB extends Dexie {
  profiles!: EntityTable<Profile, 'id'>;
  weights!: EntityTable<WeightEntry, 'id'>;
  changes!: EntityTable<ChangeLogEntry, 'id'>;
  meta!: EntityTable<Meta, 'key'>;

  constructor(name = 'fitness-coach') {
    super(name);
    this.version(1).stores({
      profiles: 'id, name',
      weights: '++id, profileId, [profileId+date]',
      changes: '++id, profileId, at',
      meta: 'key'
    });
  }
}

export const db = new CoachDB();

export async function getMeta<T>(key: string, fallback: T, d: CoachDB = db): Promise<T> {
  const row = await d.meta.get(key);
  return row === undefined ? fallback : (row.value as T);
}

export async function setMeta(key: string, value: unknown, d: CoachDB = db): Promise<void> {
  await d.meta.put({ key, value });
}

/** Speichert ein Profil und protokolliert das Gewicht, falls es sich geändert hat. */
export async function saveProfile(p: Profile, d: CoachDB = db): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const updated: Profile = { ...$plain(p), updatedAt: new Date().toISOString() };
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
  await d.transaction('rw', d.profiles, d.weights, d.changes, async () => {
    await d.profiles.delete(id);
    await d.weights.where('profileId').equals(id).delete();
    await d.changes.where('profileId').equals(id).delete();
  });
}

/** Entfernt Svelte-Proxies, damit IndexedDB klonen kann. */
function $plain<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
