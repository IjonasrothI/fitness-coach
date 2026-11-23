// Täglicher Check-in: Speichern und Tagesform laden.
import { db, plain, type CoachDB } from './db';
import { readiness, todayKey, type Readiness } from './readiness';
import type { CheckIn, Profile } from './types';

export async function getCheckIn(pid: string, date = todayKey(), d: CoachDB = db): Promise<CheckIn | undefined> {
  return d.checkins.get(`${pid}:${date}`);
}

export async function checkinHistory(pid: string, days = 60, d: CoachDB = db): Promise<CheckIn[]> {
  const all = await d.checkins.where('profileId').equals(pid).toArray();
  const since = todayKey(new Date(Date.now() - days * 86400000));
  return all.filter((c) => c.date >= since).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveCheckIn(c: CheckIn, d: CoachDB = db): Promise<void> {
  await d.checkins.put(plain(c));
}

/** Tagesform für heute, oder null wenn noch kein Check-in. */
export async function todayReadiness(p: Profile, d: CoachDB = db): Promise<Readiness | null> {
  const today = await getCheckIn(p.id, todayKey(), d);
  if (!today) return null;
  const hist = await checkinHistory(p.id, 40, d);
  return readiness(today, hist, p);
}

/** Profil mit heutigen Schmerzregionen als temporäre Beschwerden (für Übungsauswahl). */
export function withPainRegions(p: Profile, r: Readiness | null): Profile {
  if (!r || r.caps.painRegions.length === 0) return p;
  return {
    ...p,
    health: {
      ...p.health,
      injuries: [...p.health.injuries, ...r.caps.painRegions.map((region) => ({ region, note: 'heute Schmerz > 5', current: true }))]
    }
  };
}
