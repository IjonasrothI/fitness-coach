// Export/Import als JSON-Datei (T8-Ersatz ohne Cloud). Daten verlassen das Gerät nur,
// wenn der Nutzer die Datei selbst speichert.
import { db, getMeta, setMeta, type CoachDB } from './db';
import type { ChangeLogEntry, Profile, WeightEntry } from './types';

export const BACKUP_FORMAT = 'fitness-coach-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_REMINDER_DAYS = 14;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  profiles: Profile[];
  weights: WeightEntry[];
  changes: ChangeLogEntry[];
  activeProfileId: string | null;
}

export async function createBackup(d: CoachDB = db): Promise<Backup> {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    profiles: await d.profiles.toArray(),
    weights: await d.weights.toArray(),
    changes: await d.changes.toArray(),
    activeProfileId: await getMeta<string | null>('activeProfileId', null, d)
  };
}

export class BackupError extends Error {}

export function parseBackup(text: string): Backup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('Die Datei ist kein gültiges JSON.');
  }
  if (typeof data !== 'object' || data === null) throw new BackupError('Unbekanntes Dateiformat.');
  const b = data as Partial<Backup>;
  if (b.format !== BACKUP_FORMAT) throw new BackupError('Das ist keine Sicherung dieser App.');
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    throw new BackupError('Die Sicherung stammt aus einer neueren App-Version. Bitte App aktualisieren.');
  }
  if (!Array.isArray(b.profiles) || !Array.isArray(b.weights) || !Array.isArray(b.changes)) {
    throw new BackupError('Die Sicherung ist unvollständig.');
  }
  for (const p of b.profiles) {
    if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') {
      throw new BackupError('Ein Profil in der Sicherung ist beschädigt.');
    }
  }
  return b as Backup;
}

/** Ersetzt alle Daten auf dem Gerät durch die Sicherung. */
export async function restoreBackup(b: Backup, d: CoachDB = db): Promise<void> {
  await d.transaction('rw', [d.profiles, d.weights, d.changes, d.meta], async () => {
    await d.profiles.clear();
    await d.weights.clear();
    await d.changes.clear();
    await d.profiles.bulkPut(b.profiles);
    await d.weights.bulkPut(b.weights);
    await d.changes.bulkPut(b.changes);
    const active = b.activeProfileId && b.profiles.some((p) => p.id === b.activeProfileId)
      ? b.activeProfileId
      : (b.profiles[0]?.id ?? null);
    await setMeta('activeProfileId', active, d);
  });
}

export function backupFileName(date = new Date()): string {
  return `fitness-coach-sicherung-${date.toISOString().slice(0, 10)}.json`;
}

export function backupDue(lastBackupIso: string | null, now = new Date()): boolean {
  if (!lastBackupIso) return true;
  return now.getTime() - new Date(lastBackupIso).getTime() > BACKUP_REMINDER_DAYS * 24 * 3600 * 1000;
}

/**
 * Teilt die Datei über das iOS-Teilen-Menü („In Dateien sichern"), sonst Download.
 */
export async function exportToFile(d: CoachDB = db): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const backup = await createBackup(d);
  const json = JSON.stringify(backup, null, 2);
  const name = backupFileName();
  const file = new File([json], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Fitness-Coach-Sicherung' });
      await setMeta('lastBackupAt', new Date().toISOString(), d);
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  await setMeta('lastBackupAt', new Date().toISOString(), d);
  return 'downloaded';
}
