<script lang="ts">
  import ExerciseCard from '../components/ExerciseCard.svelte';
  import ExerciseAnim from '../components/ExerciseAnim.svelte';
  import { MOTIONS } from '../lib/motions';
  import { EXERCISES, PATTERNS } from '../lib/exercises';
  import { app } from '../lib/state.svelte';
  import { MOBILITY } from '../lib/mobility';

  let open = $state<string | null>(null);
  // Entwicklung: ?gallery zeigt alle Animationen gleichzeitig
  const all = import.meta.env.DEV && location.search.includes('gallery');
</script>

<main>
  <button class="ghost" onclick={() => (app.library = false)}>‹ Zurück</button>
  <h1>Übungen</h1>
  <p class="small muted">Alle Übungen mit Bewegungsablauf und beanspruchten Muskeln. Tippe auf eine Übung; tippe auf die Animation, um sie anzuhalten.</p>
  {#each PATTERNS as pat (pat.id)}
    <h2>{pat.name}</h2>
    {#each EXERCISES.filter((e) => e.pattern === pat.id) as e (e.id)}
      <div class="card item">
        <button class="head" onclick={() => (open = open === e.id ? null : e.id)} aria-expanded={open === e.id}>
          <span>{e.name}</span><span class="muted">{open === e.id ? '–' : '+'}</span>
        </button>
        {#if all}<div class="gal">{#each [0, 1, 2, 3].slice(0, MOTIONS[e.id]?.frames.length ?? 1) as f (f)}<ExerciseAnim id={e.id} frame={f} />{/each}</div>{:else if open === e.id}<div class="body"><ExerciseCard id={e.id} /></div>{/if}
      </div>
    {/each}
  {/each}
  <h2>Mobility (Morgenroutine)</h2>
  {#each MOBILITY as m (m.id)}
    <div class="card item">
      <button class="head" onclick={() => (open = open === m.id ? null : m.id)} aria-expanded={open === m.id}>
        <span>{m.name}</span><span class="muted">{open === m.id ? '–' : '+'}</span>
      </button>
      {#if all}<div class="gal">{#each [0, 1, 2, 3].slice(0, MOTIONS[m.id]?.frames.length ?? 1) as f (f)}<ExerciseAnim id={m.id} frame={f} />{/each}</div>
      {:else if open === m.id}
        <div class="body">
          <ExerciseAnim id={m.id} label={m.name} />
          <ul class="cues">{#each m.cues as c (c)}<li>{c}</li>{/each}</ul>
          <p class="small muted">{m.area}{m.unilateral ? ' · je Seite' : ''}</p>
        </div>
      {/if}
    </div>
  {/each}
</main>

<style>
  .item { padding: 0; }
  .head { display: flex; justify-content: space-between; width: 100%; text-align: left; background: transparent; border: 0; padding: 14px 16px; font-weight: 600; }
  .body { padding: 0 16px 16px; }
  .cues { padding-left: 20px; margin: 10px 0 4px; }
  .gal { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 0 8px 8px; }
</style>
