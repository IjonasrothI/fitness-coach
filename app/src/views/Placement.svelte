<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import FeedbackSheet from '../components/FeedbackSheet.svelte';
  import RestTimer from '../components/RestTimer.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { EXERCISE_BY_ID, PATTERNS, PATTERN_BY_ID } from '../lib/exercises';
  import { app } from '../lib/state.svelte';
  import { keepAwake, unlockAudio } from '../lib/sound';
  import { ladder, placementNext, stepLabel, windowFor } from '../lib/strength';
  import { ensureStates, giveFeedback, setPlacement } from '../lib/training';
  import type { FeedbackReason, LadderStep, PatternState, Profile } from '../lib/types';

  let { profile, half }: { profile: Profile; half: 'lower' | 'upper' } = $props();

  let queue = $state<PatternState[]>([]);
  let idx = $state(0);
  let step = $state<LadderStep | null>(null);
  let attempt = $state(0);
  let reps = $state(12);
  let note = $state<string | null>(null);
  let resting = $state(false);
  let finished = $state(false);
  let results = $state<{ pattern: string; label: string }[]>([]);
  let showFeedback = $state(false);

  onMount(async () => {
    window.scrollTo(0, 0);
    keepAwake(true);
    const states = await ensureStates(profile);
    const order = PATTERNS.filter((p) => p.half === half).map((p) => p.id);
    queue = order.map((id) => states.find((s) => s.pattern === id)).filter((s): s is PatternState => !!s);
    load();
  });
  onDestroy(() => keepAwake(false));

  let cur = $derived(queue[idx]);
  let ex = $derived(step ? EXERCISE_BY_ID[step.exerciseId] : undefined);

  function load() {
    if (idx >= queue.length) {
      finished = true;
      return;
    }
    step = queue[idx]!.step;
    attempt = 0;
    note = null;
    const [lo, hi] = windowFor(step);
    reps = Math.round((lo + hi) / 2);
  }

  async function submit() {
    if (!cur || !step) return;
    unlockAudio();
    const steps = ladder(cur.pattern, profile, cur.blocked);
    const r = placementNext(steps, step, reps, attempt);
    if (r.done) {
      await setPlacement({ ...cur, step: r.step });
      results = [...results, { pattern: PATTERN_BY_ID[cur.pattern].name, label: stepLabel(r.step, profile) }];
      idx++;
      load();
      if (!finished) resting = true;
    } else {
      note = r.note;
      step = r.step;
      attempt++;
      const [lo, hi] = windowFor(r.step);
      reps = Math.round((lo + hi) / 2);
      resting = true;
    }
    window.scrollTo(0, 0);
  }

  function skip() {
    idx++;
    load();
  }

  async function onFeedback(reason: FeedbackReason, text: string) {
    showFeedback = false;
    if (!cur) return;
    const r = await giveFeedback(profile, cur.pattern, reason, text);
    if (!r) {
      note = 'Keine Alternative verfügbar – Muster übersprungen.';
      skip();
      return;
    }
    queue[idx] = r.state;
    step = r.state.step;
    note = `Getauscht: ${stepLabel(r.state.step, profile)}`;
  }
</script>

<main>
  <div class="top">
    <button class="ghost" onclick={() => (app.placement = null)}>Beenden</button>
    <span class="small muted">{Math.min(idx + 1, queue.length)} / {queue.length}</span>
  </div>

  {#if finished}
    <h1>Einstufung fertig</h1>
    <p class="muted">Deine Startstufen. Ab jetzt passt die App sie nach jeder Einheit an.</p>
    <ul class="list card">
      {#each results as r (r.pattern)}<li><b>{r.pattern}</b><br /><span class="small muted">{r.label}</span></li>{/each}
    </ul>
    <button class="primary block" onclick={() => { app.placement = null; app.view = 'strength'; }}>Fertig</button>
  {:else if resting && step}
    {#if note}<div class="card accent"><p class="small">{note}</p></div>{/if}
    <RestTimer seconds={120} next={stepLabel(step, profile)} ondone={() => (resting = false)} />
  {:else if cur && step && ex}
    <p class="small muted">Einstufung {half === 'lower' ? 'Unterkörper' : 'Oberkörper'} · {PATTERN_BY_ID[cur.pattern].name}{attempt ? ` · Versuch ${attempt + 1}` : ''}</p>
    <h1>{ex.name}</h1>
    {#if step.bandLevel !== undefined}<p class="band">Band {step.bandLevel}</p>{/if}
    {#if note}<div class="card accent"><p class="small">{note}</p></div>{/if}
    <div class="card">
      <p class="small"><b>Ein Satz bis etwa 1 Wiederholung vor dem Muskelversagen</b> – saubere Technik. Ziel: {windowFor(step)[0]}–{windowFor(step)[1]} Wdh.{ex.unilateral ? ' (schwächere Seite zählt)' : ''}</p>
      <ul class="small">{#each ex.cues as c (c)}<li>{c}</li>{/each}</ul>
    </div>
    <span class="lbl">Geschaffte Wiederholungen</span>
    <Stepper bind:value={reps} label="Wiederholungen" max={100} />
    <button class="primary block save" onclick={submit}>Weiter</button>
    <div class="row secondary">
      <button onclick={() => (showFeedback = true)}>Klappt nicht</button>
      <button onclick={skip}>Überspringen</button>
    </div>
  {:else}
    <p class="muted">Lade …</p>
  {/if}
</main>

{#if showFeedback && step}
  <FeedbackSheet exerciseName={stepLabel(step, profile)} onsubmit={onFeedback} oncancel={() => (showFeedback = false)} />
{/if}

<style>
  .top { display: flex; justify-content: space-between; align-items: center; }
  .band { font-weight: 600; color: var(--accent); margin: 0; }
  .card ul { padding-left: 20px; margin: 6px 0 0; }
  .lbl { display: block; font-size: 14px; color: var(--muted); font-weight: 600; margin: 16px 0 6px; }
  .save { margin-top: 24px; min-height: 56px; font-size: 18px; }
  .secondary { margin-top: 10px; }
</style>
