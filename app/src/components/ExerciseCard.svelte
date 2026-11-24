<script lang="ts">
  import ExerciseAnim from './ExerciseAnim.svelte';
  import MuscleMap from './MuscleMap.svelte';
  import { EXERCISE_BY_ID } from '../lib/exercises';

  let { id, showCues = true, view = $bindable<'move' | 'muscles'>('move') }: { id: string; showCues?: boolean; view?: 'move' | 'muscles' } = $props();
  let ex = $derived(EXERCISE_BY_ID[id]!);
</script>

<div class="ec">
  <div class="seg" role="tablist" aria-label="Darstellung">
    <button role="tab" aria-selected={view === 'move'} class:on={view === 'move'} onclick={() => (view = 'move')}>Bewegung</button>
    <button role="tab" aria-selected={view === 'muscles'} class:on={view === 'muscles'} onclick={() => (view = 'muscles')}>Muskeln</button>
  </div>
  {#if view === 'move'}
    <ExerciseAnim {id} label={ex.name} />
  {:else}
    <MuscleMap muscles={ex.muscles} />
  {/if}
  {#if showCues}
    <ul class="cues">{#each ex.cues.slice(0, 2) as c (c)}<li>{c}</li>{/each}</ul>
    {#if ex.cues.length > 2}
      <details class="small"><summary>Mehr Hinweise</summary><ul>{#each ex.cues.slice(2) as c (c)}<li>{c}</li>{/each}</ul></details>
    {/if}
  {/if}
</div>

<style>
  .seg { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: var(--surface-2); padding: 3px; border-radius: 10px; margin-bottom: 8px; }
  .seg button { min-height: 34px; padding: 4px; font-size: 14px; font-weight: 600; background: transparent; border: 0; color: var(--muted); border-radius: 8px; }
  .seg button.on { background: var(--surface); color: var(--text); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }
  .cues { margin: 10px 0 4px; padding-left: 20px; font-size: 16px; }
  .cues li { margin: 2px 0; }
  details { color: var(--muted); }
  summary { cursor: pointer; color: var(--accent); font-weight: 600; }
  details ul { padding-left: 20px; margin: 6px 0; color: var(--text); }
</style>
