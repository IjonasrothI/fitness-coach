<script lang="ts">
  import { exportToFile, parseBackup, restoreBackup, BackupError } from '../lib/backup';
  import { newProfile } from '../lib/defaults';
  import { app } from '../lib/state.svelte';

  let message = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);
  let fileInput: HTMLInputElement;
  let confirmDelete = $state<string | null>(null);

  async function doExport() {
    message = null;
    const r = await exportToFile();
    if (r !== 'cancelled') {
      await app.load();
      message = { kind: 'ok', text: r === 'shared' ? 'Sicherung erstellt.' : 'Sicherung heruntergeladen.' };
    }
  }

  async function doImport(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    message = null;
    try {
      const backup = parseBackup(await file.text());
      const n = backup.profiles.length;
      const ok = confirm(`Sicherung vom ${new Date(backup.exportedAt).toLocaleDateString('de-DE')} mit ${n} Profil(en) laden?\n\nAlle aktuellen Daten auf diesem iPhone werden dabei ersetzt.`);
      if (!ok) return;
      await restoreBackup(backup);
      await app.load();
      message = { kind: 'ok', text: 'Sicherung geladen.' };
    } catch (err) {
      message = { kind: 'err', text: err instanceof BackupError ? err.message : 'Die Datei konnte nicht gelesen werden.' };
    } finally {
      fileInput.value = '';
    }
  }

  async function remove(id: string) {
    await app.remove(id);
    confirmDelete = null;
  }
</script>

<main>
  <h1>Daten</h1>

  <h2>Profile auf diesem iPhone</h2>
  <ul class="list card">
    {#each app.profiles as p (p.id)}
      <li class="prow">
        <button class="pname" onclick={() => app.switchTo(p.id)}>
          <b>{p.name}</b> {#if p.id === app.activeId}<span class="badge">aktiv</span>{/if}
        </button>
        {#if confirmDelete === p.id}
          <button class="danger" onclick={() => remove(p.id)}>Wirklich löschen</button>
          <button onclick={() => (confirmDelete = null)}>Nein</button>
        {:else}
          <button class="ghost" onclick={() => (confirmDelete = p.id)}>Löschen</button>
        {/if}
      </li>
    {/each}
  </ul>
  <button class="block" onclick={() => (app.editing = { profile: newProfile(), mode: 'new', step: 0 })}>+ Weiteres Profil</button>
  <p class="muted small">Normalerweise hat jede Person die App auf dem eigenen iPhone. Mehrere Profile sind z. B. zum Ausprobieren gedacht.</p>

  <h2>Sicherung</h2>
  <div class="card">
    <p class="small">Alle Daten liegen nur auf diesem iPhone – nichts wird ins Internet geschickt. Wird die App vom Home-Bildschirm gelöscht, sind die Daten weg.</p>
    <p class="small muted">Letzte Sicherung: {app.lastBackupAt ? new Date(app.lastBackupAt).toLocaleDateString('de-DE') : 'noch keine'}</p>
    <button class="primary block" onclick={doExport}>Sicherung speichern</button>
    <p class="small muted hint">Im Teilen-Menü „In Dateien sichern" wählen, z. B. iCloud Drive.</p>
    <button class="block" onclick={() => fileInput.click()}>Sicherung laden</button>
    <input bind:this={fileInput} type="file" accept="application/json,.json" onchange={doImport} hidden />
  </div>

  {#if message}
    <div class="card" class:accent={message.kind === 'ok'} class:danger={message.kind === 'err'} role="status">
      <p class="small">{message.text}</p>
    </div>
  {/if}

  <h2>Über die App</h2>
  <div class="card">
    <p class="small">Version {__APP_VERSION__}. Trainingsregeln beruhen auf aktueller Sportwissenschaft (Stand Nov. 2026); jede automatische Änderung wird mit Begründung angezeigt.</p>
    <p class="small muted">Die App ersetzt keine ärztliche Beratung. Bei Brustschmerz, unerklärter Atemnot, Herzrasen mit Schwindel oder Ohnmacht Training sofort abbrechen und ärztlich abklären lassen.</p>
  </div>
</main>

<style>
  .prow { display: flex; gap: 8px; align-items: center; }
  .pname { flex: 1; background: none; text-align: left; padding-left: 0; font-weight: 400; }
  .badge { font-size: 12px; background: var(--accent-soft); color: var(--text); padding: 2px 8px; border-radius: 8px; margin-left: 6px; }
  .hint { margin: 6px 0 14px; }
</style>
