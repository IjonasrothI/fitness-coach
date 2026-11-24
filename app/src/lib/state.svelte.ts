import { db, getMeta, saveProfile, setMeta, deleteProfile as dbDelete } from './db';
import { backupDue } from './backup';
import { activeSession } from './training';
import type { PlannedItem, Profile, StrengthSession } from './types';

export type View = 'home' | 'week' | 'strength' | 'endurance' | 'progress' | 'more';

class AppState {
  loaded = $state(false);
  profiles = $state<Profile[]>([]);
  activeId = $state<string | null>(null);
  view = $state<View>('home');
  /** Profil, das gerade im Assistenten bearbeitet/angelegt wird */
  editing = $state<{ profile: Profile; mode: 'new' | 'edit'; step: number } | null>(null);
  lastBackupAt = $state<string | null>(null);
  /** Laufende Krafteinheit (Vollbild-Player) */
  session = $state<StrengthSession | null>(null);
  /** Laufende Einstufung */
  placement = $state<'lower' | 'upper' | null>(null);
  /** Aus dem Wochenplan gewählte Ausdauereinheit */
  plannedEndurance = $state<PlannedItem | null>(null);

  active = $derived(this.profiles.find((p) => p.id === this.activeId) ?? null);
  /** Erinnerung 14 Tage nach letzter Sicherung bzw. nach Anlegen des ersten Profils */
  backupReminder = $derived(
    this.profiles.length > 0 &&
      backupDue(this.lastBackupAt ?? this.profiles.map((p) => p.createdAt).sort()[0] ?? null)
  );

  async load() {
    this.profiles = await db.profiles.toArray();
    const stored = await getMeta<string | null>('activeProfileId', null);
    this.activeId = this.profiles.some((p) => p.id === stored) ? stored : (this.profiles[0]?.id ?? null);
    this.lastBackupAt = await getMeta<string | null>('lastBackupAt', null);
    if (!this.loaded && this.activeId) this.session = await activeSession(this.activeId);
    this.loaded = true;
  }

  async save(p: Profile) {
    const before = this.profiles.find((x) => x.id === p.id);
    await saveProfile(p);
    if (before && (JSON.stringify(before.availability) !== JSON.stringify(p.availability) || before.goals.focus !== p.goals.focus)) {
      const { applyProfileAvailability } = await import('./weekStore');
      await applyProfileAvailability(p);
    }
    await this.load();
  }

  async switchTo(id: string) {
    this.activeId = id;
    await setMeta('activeProfileId', id);
    this.view = 'home';
  }

  async remove(id: string) {
    await dbDelete(id);
    if (this.activeId === id) await setMeta('activeProfileId', null);
    await this.load();
  }
}

export const app = new AppState();
