<script lang="ts">
  import { onMount } from 'svelte';
  import { minutesLabel, ROUTINE_LABELS, routineForToday, routineSeconds, routineSetup } from '../lib/mobility';
  import type { Readiness } from '../lib/readiness';
  import { getRoutineLog, resumeIndex, routineDays } from '../lib/routineStore';
  import { app } from '../lib/state.svelte';
  import type { Profile, RoutineKind, RoutineLog } from '../lib/types';

  interface Props {
    profile: Profile;
    kind: RoutineKind;
    ready: Readiness | null;
    /** Grund, warum die Routine heute entfällt (z. B. intensives Krafttraining) */
    restDay?: string | null;
    hasCheckIn: boolean;
    onedit: () => void;
  }
  let { profile, kind, ready, restDay = null, hasCheckIn, onedit }: Props = $props();

  let log = $state<RoutineLog | undefined>(undefined);
  let days = $state<{ date: string; status: string }[]>([]);
  onMount(async () => {
    log = await getRoutineLog(profile.id, kind);
    days = await routineDays(profile.id, kind, 7);
  });

  let setup = $derived(routineSetup(profile, kind));
  let today = $derived(routineForToday(setup,
    ready ? { light: ready.light, hardStop: ready.caps.hardStop, noTraining: ready.caps.noTraining } : null));
  let canResume = $derived(!!log && log.status !== 'done' && log.status !== 'skipped' && resumeIndex(log) < log.items.length);
  let rounds = $derived(setup.rounds ?? 1);

  function start() {
    app.routine = { kind, items: today.items, gentle: today.gentle, restSec: today.restSec };
    window.scrollTo(0, 0);
  }
</script>

<div class="card routine">
  <div class="rhead">
    <h3>{ROUTINE_LABELS[kind]}</h3>
    <span class="rdots" aria-label="{ROUTINE_LABELS[kind]} der letzten 7 Tage">
      {#each days as d (d.date)}<span class="rdot {d.status}" title={d.date}></span>{/each}
    </span>
  </div>
  {#if today.blocked}
    <p class="small">Heute keine Routine – siehe Tagesform.</p>
  {:else if log?.status === 'done'}
    <p class="small"><span class="done">✓ erledigt</span> · {Math.max(1, Math.round(log.seconds / 60))} min</p>
  {:else if canResume && log}
    <p class="small">{log.done.length} von {log.items.length} Übungen gemacht.</p>
    <button class="primary block" onclick={start}>Fortsetzen</button>
  {:else}
    <p class="small">
      {setup.items.length} {kind === 'morning' ? 'Mobility-Übungen' : 'Übungen'}{rounds > 1 && !today.gentle ? ` × ${rounds} Runden` : ''}
      · ca. {minutesLabel(routineSeconds(today.items, today.restSec))}{today.gentle ? ' · heute sanfter' : ''}{log?.status === 'skipped' ? ' · heute übersprungen' : ''}
    </p>
    {#if ready?.caps.noTraining}<p class="small muted">Heute lieber ausruhen. Wenn du magst, geht die sanfte Version.</p>
    {:else if restDay}<p class="small muted">{restDay}</p>{/if}
    {#if kind === 'morning' && !hasCheckIn && setup.autoStart}<p class="small muted">Startet automatisch nach dem Check-in.</p>{/if}
    {#if kind === 'evening' && !restDay && !log}<p class="small muted">Locker bleiben: Jede Übung beenden, solange noch 3–4 Wiederholungen gingen.</p>{/if}
    <button class={(kind === 'morning' ? hasCheckIn : !restDay) ? 'primary block' : 'block'} onclick={start}>
      {log?.status === 'skipped' || restDay ? 'Trotzdem starten' : 'Jetzt starten'}
    </button>
  {/if}
  <button class="ghost" onclick={onedit}>Übungen anpassen</button>
</div>

<style>
  .rhead { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .rhead h3 { margin: 0; }
  .rdots { display: flex; gap: 4px; }
  .rdot { width: 10px; height: 10px; border-radius: 50%; background: var(--surface-2); }
  .rdot.done { background: var(--accent); }
  .rdot.partial, .rdot.running { background: var(--accent-soft); outline: 1.5px solid var(--accent); outline-offset: -1.5px; }
  .block { margin-top: 8px; }
  .done { color: var(--accent); font-weight: 600; }
</style>
