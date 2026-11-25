// Tagesroutinen speichern (M8): ein Eintrag je Profil, Tag und Routine.
import { db, plain, type CoachDB } from './db';
import { todayKey } from './readiness';
import type { RoutineItem, RoutineKind, RoutineLog } from './types';

export const routineId = (pid: string, date: string, kind: RoutineKind) => `${pid}:${date}:${kind}`;

export async function getRoutineLog(pid: string, kind: RoutineKind, date = todayKey(), d: CoachDB = db): Promise<RoutineLog | undefined> {
  return d.routines.get(routineId(pid, date, kind));
}

export async function saveRoutineLog(l: RoutineLog, d: CoachDB = db): Promise<void> {
  await d.routines.put(plain(l));
}

export function newRoutineLog(pid: string, kind: RoutineKind, items: RoutineItem[], gentle: boolean, date = todayKey()): RoutineLog {
  return {
    id: routineId(pid, date, kind), profileId: pid, date, kind, startedAt: new Date().toISOString(),
    status: 'running', items: plain(items), done: [], skipped: [], gentle, seconds: 0
  };
}

/** Status je Tag der letzten `days` Tage (ältester zuerst). */
export async function routineDays(pid: string, kind: RoutineKind, days = 7, now = new Date(), d: CoachDB = db): Promise<{ date: string; status: RoutineLog['status'] | 'none' }[]> {
  const all = await d.routines.where('profileId').equals(pid).toArray();
  const out: { date: string; status: RoutineLog['status'] | 'none' }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = todayKey(new Date(now.getTime() - i * 86400000));
    const l = all.find((x) => x.date === date && x.kind === kind);
    out.push({ date, status: l?.status ?? 'none' });
  }
  return out;
}

/** Index der ersten noch offenen Übung (für „Fortsetzen"). */
export function resumeIndex(l: RoutineLog): number {
  const i = l.items.findIndex((x) => !l.done.includes(x.id) && !l.skipped.includes(x.id));
  return i < 0 ? l.items.length : i;
}
