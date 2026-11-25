<script lang="ts">
  import { onMount } from 'svelte';
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import { newProfile } from './lib/defaults';
  import { app, type View } from './lib/state.svelte';
  import ProfileWizard from './views/ProfileWizard.svelte';
  import Home from './views/Home.svelte';
  import ProfileView from './views/ProfileView.svelte';
  import DataView from './views/DataView.svelte';
  import StrengthView from './views/StrengthView.svelte';
  import EnduranceView from './views/EnduranceView.svelte';
  import WeekView from './views/WeekView.svelte';
  import ProgressView from './views/ProgressView.svelte';
  import Player from './views/Player.svelte';
  import Placement from './views/Placement.svelte';
  import ExerciseLibrary from './views/ExerciseLibrary.svelte';
  import RoutinePlayer from './views/RoutinePlayer.svelte';

  const { needRefresh, updateServiceWorker } = useRegisterSW();

  onMount(() => {
    app.load();
  });

  const tabs: { id: View; label: string; icon: string }[] = [
    { id: 'home', label: 'Heute', icon: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10' },
    { id: 'week', label: 'Woche', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
    { id: 'strength', label: 'Kraft', icon: 'M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12' },
    { id: 'endurance', label: 'Ausdauer', icon: 'M13 4a2 2 0 100-4 2 2 0 000 4zM7 22l3-7 3 3v6M10 15l-2-5 5-2 3 4 4 1M6 12l2-2' },
    { id: 'progress', label: 'Verlauf', icon: 'M4 19h16M5 16l4-5 4 3 6-8' },
    { id: 'more', label: 'Mehr', icon: 'M4 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M10.5 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M17 12a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0' }
  ];
</script>

{#if !app.loaded}
  <main><p class="muted">Lade …</p></main>
{:else if app.editing}
  {#key app.editing}
    <ProfileWizard initial={app.editing.profile} mode={app.editing.mode} startStep={app.editing.step} />
  {/key}
{:else if app.active && app.session}
  {#key app.session.id}
    <Player profile={app.active} initial={app.session} />
  {/key}
{:else if app.active && app.routine}
  <RoutinePlayer profile={app.active} kind={app.routine.kind} items={app.routine.items} gentle={app.routine.gentle} />
{:else if app.active && app.placement}
  {#key app.placement}
    <Placement profile={app.active} half={app.placement} />
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
  {:else if app.view === 'strength' && app.library}
    <ExerciseLibrary />
  {:else if app.view === 'strength'}
    <StrengthView profile={app.active} />
  {:else if app.view === 'endurance'}
    <EnduranceView profile={app.active} />
  {:else if app.view === 'week'}
    <WeekView profile={app.active} />
  {:else if app.view === 'progress'}
    <ProgressView profile={app.active} />
  {:else}
    <ProfileView profile={app.active} />
    <DataView />
  {/if}

  <nav class="tabbar" aria-label="Hauptnavigation">
    {#each tabs as t (t.id)}
      <button class:on={app.view === t.id} onclick={() => { app.view = t.id; window.scrollTo(0, 0); }} aria-current={app.view === t.id ? 'page' : undefined}>
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
    font-size: 11px; font-weight: 500; color: var(--muted); padding: 6px 0; min-height: 52px; min-width: 0;
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
