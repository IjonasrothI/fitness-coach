<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import ExerciseAnim from '../components/ExerciseAnim.svelte';
  import WorkTimer from '../components/WorkTimer.svelte';
  import { COUNT_IN_SEC, MOBILITY_BY_ID, ROUTINE_LABELS, routineSeconds } from '../lib/mobility';
  import { getRoutineLog, newRoutineLog, resumeIndex, saveRoutineLog } from '../lib/routineStore';
  import { keepAwake, setVoice, unlockAudio, voiceOn } from '../lib/sound';
  import { app } from '../lib/state.svelte';
  import type { Profile, RoutineItem, RoutineKind, RoutineLog } from '../lib/types';

  interface Props { profile: Profile; kind: RoutineKind; items: RoutineItem[]; gentle: boolean }
  let { profile, kind, items, gentle }: Props = $props();

  let log = $state<RoutineLog | null>(null);
  let idx = $state(0);
  let phase = $state<'run' | 'summary'>('run');
  let voice = $state(voiceOn());
  let startedMs = Date.now();
  let view = $state<'move' | 'cues'>('move');

  onMount(async () => {
    unlockAudio();
    void keepAwake(true);
    const existing = await getRoutineLog(profile.id, kind);
    if (existing && existing.status !== 'done') {
      // Fortsetzen: gleiche Übungen wie beim Start
      log = { ...existing, status: 'running' };
      idx = resumeIndex(existing);
      startedMs = Date.now() - existing.seconds * 1000;
    } else {
      log = newRoutineLog(profile.id, kind, items, gentle);
    }
    if (idx >= log.items.length) { idx = 0; log.done = []; log.skipped = []; }
    await saveRoutineLog(log);
  });
  onDestroy(() => { void keepAwake(false); });

  let list = $derived(log?.items ?? []);
  let cur = $derived(list[idx]);
  let ex = $derived(cur ? MOBILITY_BY_ID[cur.id] : undefined);
  let leftMin = $derived(Math.max(1, Math.round(routineSeconds(list.slice(idx)) / 60)));

  async function persist() {
    if (!log) return;
    log.seconds = Math.round((Date.now() - startedMs) / 1000);
    await saveRoutineLog(log);
  }

  async function next(how: 'done' | 'skip') {
    if (!log || !cur) return;
    const id = cur.id;
    log.done = log.done.filter((x) => x !== id);
    log.skipped = log.skipped.filter((x) => x !== id);
    (how === 'done' ? log.done : log.skipped).push(id);
    if (idx + 1 >= list.length) { await finish(); return; }
    idx++;
    view = 'move';
    await persist();
  }

  function back() {
    if (idx > 0) { idx--; view = 'move'; }
  }

  async function finish() {
    if (!log) return;
    log.status = log.done.length === 0 ? 'skipped' : log.done.length === list.length ? 'done' : 'partial';
    log.finishedAt = new Date().toISOString();
    await persist();
    void keepAwake(false);
    phase = 'summary';
  }

  async function skipToday() {
    if (!log) return;
    if (log.done.length === 0) {
      log.status = 'skipped';
      log.finishedAt = new Date().toISOString();
      await persist();
      close();
    } else await finish();
  }

  function close() {
    app.routine = null;
    window.scrollTo(0, 0);
  }

  function toggleVoice() { voice = !voice; setVoice(voice); }
  const mins = (s: number) => Math.max(1, Math.round(s / 60));
</script>

<main class="rp">
  {#if !log}
    <p class="muted">Lade …</p>
  {:else if phase === 'run' && cur && ex}
    <div class="top">
      <button class="ghost" onclick={skipToday}>{log.done.length ? 'Beenden' : 'Heute überspringen'}</button>
      <button class="ghost" onclick={toggleVoice} aria-pressed={voice}>{voice ? 'Stimme an' : 'Stimme aus'}</button>
    </div>
    <p class="small muted meta">{ROUTINE_LABELS[kind]}{log.gentle ? ' · sanft' : ''} · Übung {idx + 1} von {list.length} · noch ca. {leftMin} min</p>
    <div class="dots" aria-hidden="true">
      {#each list as it, i (it.id)}
        <span class:done={log.done.includes(it.id)} class:skip={log.skipped.includes(it.id)} class:cur={i === idx}></span>
      {/each}
    </div>
    <h1 class="name">{ex.name}</h1>
    {#key idx}
      <WorkTimer seconds={cur.sec} sides={ex.unilateral ? 2 : 1} countIn={COUNT_IN_SEC} note={ex.short} ondone={() => next('done')} />
    {/key}
    <div class="seg" role="tablist" aria-label="Darstellung">
      <button role="tab" aria-selected={view === 'move'} class:on={view === 'move'} onclick={() => (view = 'move')}>Bewegung</button>
      <button role="tab" aria-selected={view === 'cues'} class:on={view === 'cues'} onclick={() => (view = 'cues')}>So geht's</button>
    </div>
    {#if view === 'move'}
      <ExerciseAnim id={cur.id} label={ex.name} />
    {:else}
      <ul class="cues">{#each ex.cues as c (c)}<li>{c}</li>{/each}</ul>
      <p class="small muted">Bereich: {ex.area}{ex.unilateral ? ' · Zeit gilt je Seite' : ''}</p>
    {/if}
    <div class="row nav">
      <button onclick={back} disabled={idx === 0}>← Zurück</button>
      <button onclick={() => next('skip')}>Überspringen →</button>
    </div>
  {:else}
    <h1>{log.status === 'done' ? 'Geschafft ✓' : 'Für heute beendet'}</h1>
    <div class="card accent">
      <p><b>{log.done.length} von {list.length} Übungen</b> · {mins(log.seconds)} min</p>
      <p class="small">{log.status === 'done'
        ? 'Guter Start in den Tag. Regelmäßigkeit zählt mehr als jede einzelne Einheit.'
        : 'Auch ein Teil zählt – Hauptsache, die Gewohnheit bleibt.'}</p>
    </div>
    <ul class="sum">
      {#each list as it (it.id)}
        <li class:skip={!log.done.includes(it.id)}>{log.done.includes(it.id) ? '✓' : '–'} {MOBILITY_BY_ID[it.id]?.name}</li>
      {/each}
    </ul>
    <button class="primary block big" onclick={close}>Weiter zum Tag</button>
  {/if}
</main>

<style>
  .rp { padding-bottom: 32px; }
  .top { display: flex; justify-content: space-between; }
  .top button { min-height: 40px; }
  .meta { margin: 0 0 6px; }
  .dots { display: flex; gap: 5px; margin-bottom: 6px; }
  .dots span { flex: 1; height: 5px; border-radius: 3px; background: var(--surface-2); }
  .dots span.done { background: var(--accent); }
  .dots span.skip { background: var(--line); }
  .dots span.cur { outline: 2px solid var(--accent); outline-offset: 1px; }
  .name { font-size: 24px; margin: 4px 0 2px; }
  .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: var(--surface-2); padding: 3px; border-radius: 10px; margin-bottom: 8px; }
  .seg button { min-height: 34px; padding: 4px; font-size: 14px; font-weight: 600; background: transparent; border: 0; color: var(--muted); border-radius: 8px; }
  .seg button.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
  .cues { margin: 6px 0; padding-left: 20px; font-size: 16px; }
  .cues li { margin: 4px 0; }
  .nav { margin-top: 12px; }
  .sum { list-style: none; padding: 0; margin: 12px 0; }
  .sum li { padding: 6px 0; border-bottom: 1px solid var(--line); }
  .sum li.skip { color: var(--muted); }
  .big { min-height: 56px; font-size: 18px; margin-top: 16px; }
</style>
