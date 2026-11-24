<script lang="ts">
  import { onDestroy } from 'svelte';
  import ExerciseAnim from './ExerciseAnim.svelte';
  import ExerciseCard from './ExerciseCard.svelte';
  import Stepper from './Stepper.svelte';
  import WorkTimer from './WorkTimer.svelte';
  import { EXERCISE_BY_ID } from '../lib/exercises';
  import { say, tick, unlockAudio } from '../lib/sound';
  import { stepLabel } from '../lib/strength';
  import type { PlannedExercise, Profile, StrengthSession } from '../lib/types';

  interface Props {
    profile: Profile;
    session: StrengthSession;
    block: number;
    easy: boolean;
    suggest: (pe: PlannedExercise) => number;
    onlog: (pe: PlannedExercise, reps: number) => Promise<void>;
    ondone: () => void;
  }
  let { profile, session, block, easy, suggest, onlog, ondone }: Props = $props();

  // svelte-ignore state_referenced_locally
  const stations = session.plan.filter((x) => (x.block ?? 0) === block);
  // svelte-ignore state_referenced_locally
  const spec = session.circuit!;
  const doneFor = (pe: PlannedExercise) => session.sets.filter((x) => x.pattern === pe.pattern).length;

  // Wiedereinstieg: erste offene Station der niedrigsten Runde
  const minDone = Math.min(...stations.map(doneFor));
  let round = $state(Math.min(minDone, spec.rounds));
  let idx = $state(Math.max(0, stations.findIndex((x) => doneFor(x) === minDone)));
  let phase = $state<'ready' | 'work' | 'rest' | 'last'>('ready');
  let pending = $state<PlannedExercise | null>(null);
  let reps = $state(10);

  let cur = $derived(stations[idx]!);
  let isLastStation = $derived(idx === stations.length - 1);

  // Pausen-Countdown
  let restEnd = 0;
  let restTotal = $state(1);
  let now = $state(Date.now());
  let lastSec = -1;
  let iv: ReturnType<typeof setInterval> | null = null;

  function startRest(sec: number) {
    restTotal = sec;
    restEnd = Date.now() + sec * 1000;
    now = Date.now();
    lastSec = -1;
    phase = 'rest';
    iv && clearInterval(iv);
    iv = setInterval(() => {
      now = Date.now();
      const left = Math.ceil((restEnd - now) / 1000);
      if (left !== lastSec) {
        lastSec = left;
        if (left === 5 && sec > 10) say(`Gleich: ${EXERCISE_BY_ID[cur.exerciseId]!.name.split(' (')[0]}`);
        if (left <= 3 && left > 0) tick();
      }
      if (now >= restEnd) void endRest();
    }, 100);
  }
  onDestroy(() => { iv && clearInterval(iv); });
  let restLeft = $derived(Math.max(0, Math.ceil((restEnd - now) / 1000)));

  function begin() {
    unlockAudio();
    if (round >= spec.rounds) { ondone(); return; }
    phase = 'work';
  }

  async function workDone() {
    pending = cur;
    reps = suggest(cur);
    if (easy) { await onlog(cur, reps); pending = null; }
    if (isLastStation && round === spec.rounds - 1) {
      if (easy) { ondone(); return; }
      phase = 'last';
      return;
    }
    // weiter zur nächsten Station
    if (isLastStation) { round++; idx = 0; startRest(spec.roundRestSec); }
    else { idx++; startRest(spec.restSec); }
  }

  async function endRest() {
    if (phase !== 'rest') return;
    iv && clearInterval(iv);
    iv = null;
    if (pending) { await onlog(pending, reps); pending = null; }
    phase = 'work';
  }

  async function finishLast() {
    if (pending) { await onlog(pending, reps); pending = null; }
    ondone();
  }

  function skipStation() {
    pending = null;
    if (isLastStation && round === spec.rounds - 1) { ondone(); return; }
    if (isLastStation) { round++; idx = 0; startRest(spec.roundRestSec); } else { idx++; startRest(spec.restSec); }
  }
  const name = (pe: PlannedExercise) => stepLabel(pe, profile);
</script>

<p class="small muted meta">Runde {Math.min(round + 1, spec.rounds)} von {spec.rounds} · Station {idx + 1} von {stations.length}</p>

{#if phase === 'ready'}
  <h1>Zirkel</h1>
  <div class="card">
    <p><b>{stations.length} Übungen × {spec.rounds} Runden</b></p>
    <p class="small muted">{spec.workSec} s Arbeit, {spec.restSec} s Pause, nach jeder Runde {spec.roundRestSec} s. {easy ? 'Locker: ruhiges Tempo, Luft nach oben lassen.' : 'Saubere Wiederholungen, zügig, aber kontrolliert.'}</p>
    <ol class="st">{#each stations as s (s.pattern)}<li>{name(s)}</li>{/each}</ol>
  </div>
  <button class="primary block big" onclick={begin}>{round > 0 || minDone > 0 ? 'Weitermachen' : "Los geht's"}</button>
{:else if phase === 'work'}
  <h1 class="name">{name(cur)}</h1>
  {#key `${round}-${idx}`}
    <WorkTimer seconds={spec.workSec} countIn={round === 0 && idx === 0 && minDone === 0 ? 5 : 0}
      switchAtHalf={!!EXERCISE_BY_ID[cur.exerciseId]?.unilateral}
      note={EXERCISE_BY_ID[cur.exerciseId]?.unilateral ? 'Seite in der Mitte wechseln' : easy ? 'Ruhiges Tempo' : ''}
      ondone={workDone} />
  {/key}
  <ExerciseCard id={cur.exerciseId} />
  <button class="ghost block" onclick={skipStation}>Station überspringen</button>
{:else if phase === 'rest'}
  <div class="rest">
    <div class="label">{idx === 0 ? 'Rundenpause' : 'Pause'}</div>
    <div class="time">{restLeft}</div>
    <div class="bar"><div style="width: {(restLeft / restTotal) * 100}%"></div></div>
  </div>
  {#if pending && !easy}
    <span class="lbl">Wie viele bei {name(pending)}?</span>
    <Stepper bind:value={reps} label="Wiederholungen" max={100} />
  {/if}
  <h3 class="nx">Als Nächstes: {name(cur)}</h3>
  <ExerciseAnim id={cur.exerciseId} label={name(cur)} />
  <button class="primary block big" onclick={endRest}>Weiter</button>
{:else}
  <h1>Letzte Station geschafft</h1>
  <span class="lbl">Wie viele bei {pending ? name(pending) : ''}?</span>
  <Stepper bind:value={reps} label="Wiederholungen" max={100} />
  <button class="primary block big" onclick={finishLast}>Zirkel abschließen</button>
{/if}

<style>
  .meta { margin: 0; }
  .name { font-size: 26px; }
  .st { margin: 8px 0 0; padding-left: 20px; }
  .big { min-height: 56px; font-size: 18px; margin-top: 16px; }
  .rest { text-align: center; padding: 12px 0 4px; }
  .label { color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 13px; }
  .time { font-size: 64px; font-weight: 750; font-variant-numeric: tabular-nums; }
  .bar { height: 6px; background: var(--surface-2); border-radius: 3px; overflow: hidden; }
  .bar div { height: 100%; background: var(--accent); transition: width 0.1s linear; }
  .lbl { display: block; font-size: 14px; color: var(--muted); font-weight: 600; margin: 16px 0 6px; }
  .nx { margin: 18px 0 8px; }
</style>
