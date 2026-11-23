<script lang="ts">
  import { onMount } from 'svelte';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import { newProfile } from './lib/defaults';
  import { app, type View } from './lib/state.svelte';
  import ProfileWizard from './views/ProfileWizard.svelte';
  import Home from './views/Home.svelte';
  import ProfileView from './views/ProfileView.svelte';
  import DataView from './views/DataView.svelte';

  const { needRefresh, updateServiceWorker } = useRegisterSW();

  onMount(() => {
    app.load();
  });

  const tabs: { id: View; label: string; icon: string }[] = [
    { id: 'home', label: 'Heute', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
    { id: 'profile', label: 'Profil', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6' },
    { id: 'data', label: 'Daten', icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' }
  ];
</script>

{#if !app.loaded}
  <main><p class="muted">Lade …</p></main>
{:else if app.editing}
  {#key app.editing}
    <ProfileWizard initial={app.editing.profile} mode={app.editing.mode} startStep={app.editing.step} />
  {/key}
{:else if !app.active}
  <main class="welcome">
    <h1>Dein persönlicher Coach</h1>
    <p>Krafttraining zuhause, Laufen und Rad – geplant nach aktueller Sportwissenschaft und angepasst an dein Feedback.</p>
    <ul class="small">
      <li>Lernt aus jedem Satz, jeder Einheit und deinem Tagesbefinden</li>
      <li>Passt sich an deine verfügbare Zeit an</li>
      <li>Zeigt jede Planänderung mit Begründung – du kannst sie überschreiben</li>
      <li>Alle Daten bleiben auf diesem iPhone</li>
    </ul>
    <button class="primary block" onclick={() => (app.editing = { profile: newProfile(), mode: 'new', step: 0 })}>Profil anlegen</button>
    <p class="muted small">Dauert etwa 5 Minuten.</p>
  </main>
{:else}
  {#if app.view === 'home'}
    <Home profile={app.active} />
  {:else if app.view === 'profile'}
    <ProfileView profile={app.active} />
  {:else}
    <DataView />
  {/if}

  <nav class="tabbar" aria-label="Hauptnavigation">
    {#each tabs as t (t.id)}
      <button class:on={app.view === t.id} onclick={() => (app.view = t.id)} aria-current={app.view === t.id ? 'page' : undefined}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d={t.icon} /></svg>
        <span>{t.label}</span>
      </button>
    {/each}
  </nav>
{/if}

{#if $needRefresh}
  <div class="update" role="status">
    <span>Neue Version verfügbar</span>
    <button class="primary" onclick={() => updateServiceWorker(true)}>Neu laden</button>
  </div>
{/if}

<style>
  .welcome { padding-top: 40px; }
  .welcome ul { padding-left: 20px; margin: 16px 0 28px; }
  .welcome li { margin: 6px 0; }
  .tabbar {
    position: fixed; left: 0; right: 0; bottom: 0; display: flex;
    background: var(--surface); border-top: 1px solid var(--line);
    padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  }
  .tabbar button {
    flex: 1; background: none; display: flex; flex-direction: column; align-items: center; gap: 2px;
    font-size: 12px; font-weight: 500; color: var(--muted); padding: 6px 0; min-height: 52px;
  }
  .tabbar button.on { color: var(--accent); font-weight: 650; }
  .tabbar svg { width: 24px; height: 24px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .update {
    position: fixed; left: 16px; right: 16px; bottom: calc(80px + env(safe-area-inset-bottom));
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);
    padding: 10px 12px 10px 16px; box-shadow: 0 6px 24px rgba(0,0,0,0.2);
  }
</style>
