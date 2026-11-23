<script lang="ts">
  import { onDestroy } from 'svelte';
  import { beep } from '../lib/sound';

  interface Props { seconds: number; next: string; ondone: () => void }
  let { seconds, next, ondone }: Props = $props();

  // Zeitbasiert, damit der Timer auch nach Bildschirmsperre stimmt
  // svelte-ignore state_referenced_locally
  let end = $state(Date.now() + seconds * 1000);
  let now = $state(Date.now());
  let fired = false;
  const tick = setInterval(() => {
    now = Date.now();
    if (!fired && now >= end) {
      fired = true;
      beep();
    }
  }, 250);
  onDestroy(() => clearInterval(tick));

  let left = $derived(Math.max(0, Math.ceil((end - now) / 1000)));
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

<div class="rest" role="timer" aria-live="off">
  <div class="label">Pause</div>
  <div class="time" class:over={left === 0}>{left === 0 ? 'Los!' : mmss(left)}</div>
  <div class="next small muted">Als Nächstes: {next}</div>
  <div class="row">
    <button onclick={() => { end += 15000; fired = false; }}>+15 s</button>
    <button class="primary" onclick={ondone}>{left === 0 ? 'Weiter' : 'Pause beenden'}</button>
  </div>
</div>

<style>
  .rest { text-align: center; padding: 24px 0; }
  .label { color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: 13px; }
  .time { font-size: 72px; font-weight: 750; font-variant-numeric: tabular-nums; letter-spacing: -0.03em; margin: 4px 0; }
  .time.over { color: var(--accent); }
  .next { margin-bottom: 20px; }
</style>
