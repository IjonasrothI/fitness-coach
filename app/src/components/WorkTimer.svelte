<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { beep, say, tick } from '../lib/sound';

  interface Props {
    /** Arbeitszeit in s (pro Seite) */
    seconds: number;
    /** 2 = einseitige Übung: zweimal arbeiten, dazwischen 5 s Seitenwechsel */
    sides?: 1 | 2;
    /** Seitenwechsel in der Mitte ansagen (Zirkel) */
    switchAtHalf?: boolean;
    /** Vorlauf in s (3-2-1) */
    countIn?: number;
    note?: string;
    ondone: () => void;
  }
  let { seconds, sides = 1, switchAtHalf = false, countIn = 3, note = '', ondone }: Props = $props();

  type Phase = 'count' | 'work' | 'switch';
  // svelte-ignore state_referenced_locally
  let phase = $state<Phase>(countIn > 0 ? 'count' : 'work');
  let side = $state(1);
  // svelte-ignore state_referenced_locally
  let total = $state(countIn > 0 ? countIn : seconds);
  // svelte-ignore state_referenced_locally
  let end = Date.now() + total * 1000;
  let now = $state(Date.now());
  let paused = $state(false);
  let pausedLeft = 0;
  let lastSec = -1;
  let halfSaid = false;
  let finished = false;

  function start(p: Phase, sec: number) {
    phase = p;
    total = sec;
    end = Date.now() + sec * 1000;
    now = Date.now();
    lastSec = -1;
  }

  function onSecond(left: number) {
    if (phase === 'count' && left > 0) tick();
    if (phase === 'work') {
      if (left === 10 && seconds >= 30) say('Noch zehn Sekunden');
      if (left <= 3 && left > 0) tick();
      if (switchAtHalf && !halfSaid && left === Math.floor(seconds / 2)) {
        halfSaid = true;
        tick(true);
        say('Seite wechseln');
      }
    }
    if (phase === 'switch' && left <= 3 && left > 0) tick();
  }

  function advance() {
    if (phase === 'count' || phase === 'switch') {
      start('work', seconds);
      halfSaid = false;
      tick(true);
      say('Los');
      return;
    }
    if (side < sides) {
      side++;
      start('switch', 5);
      beep(1);
      say('Seite wechseln');
      return;
    }
    finished = true;
    beep(2);
    say('Stopp');
    ondone();
  }

  const iv = setInterval(() => {
    if (paused || finished) return;
    now = Date.now();
    const left = Math.ceil((end - now) / 1000);
    if (left !== lastSec) { lastSec = left; onSecond(left); }
    if (now >= end) advance();
  }, 100);
  onMount(() => { if (phase === 'work') say('Los'); });
  onDestroy(() => clearInterval(iv));

  function togglePause() {
    if (!paused) { pausedLeft = end - Date.now(); paused = true; }
    else { end = Date.now() + pausedLeft; paused = false; }
  }
  function stopEarly() {
    if (finished) return;
    finished = true;
    beep(1);
    ondone();
  }

  let left = $derived(Math.max(0, Math.ceil(((paused ? pausedLeft : end - now)) / 1000)));
  let frac = $derived(Math.max(0, Math.min(1, (paused ? pausedLeft : end - now) / (total * 1000))));
  const R = 52;
  const C = 2 * Math.PI * R;
</script>

<div class="wt" class:work={phase === 'work'}>
  <div class="ring" role="timer" aria-live="off" aria-label="{left} Sekunden">
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r={R} class="track" />
      <circle cx="60" cy="60" r={R} class="bar" stroke-dasharray={C} stroke-dashoffset={C * (1 - frac)} transform="rotate(-90 60 60)" />
    </svg>
    <div class="num">{left}</div>
  </div>
  <p class="phase">
    {#if phase === 'count'}Gleich geht's los …
    {:else if phase === 'switch'}Seite wechseln
    {:else}{sides === 2 ? `Seite ${side} von 2 · ` : ''}{note || 'So viele saubere Wdh. wie möglich'}{/if}
  </p>
  <div class="row">
    <button onclick={togglePause}>{paused ? 'Weiter' : 'Pause'}</button>
    <button onclick={stopEarly}>Fertig</button>
  </div>
</div>

<style>
  .wt { text-align: center; }
  .ring { position: relative; width: 136px; height: 136px; margin: 4px auto 0; }
  .ring svg { width: 100%; height: 100%; }
  .track { fill: none; stroke: var(--surface-2); stroke-width: 9; }
  .bar { fill: none; stroke: var(--muted); stroke-width: 9; stroke-linecap: round; transition: stroke-dashoffset 0.1s linear; }
  .work .bar { stroke: var(--accent); }
  .num { position: absolute; inset: 0; display: grid; place-items: center; font-size: 50px; font-weight: 750; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
  .phase { font-weight: 600; margin: 6px 0 8px; min-height: 1.4em; }
  .row { margin-bottom: 12px; }
</style>
