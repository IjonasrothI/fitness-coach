<script lang="ts">
  import ExerciseCard from '../components/ExerciseCard.svelte';
  import ExerciseAnim from '../components/ExerciseAnim.svelte';
  import { MOTIONS } from '../lib/motions';
  import { EXERCISES, PATTERNS } from '../lib/exercises';
  import { app } from '../lib/state.svelte';

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
</main>

<style>
  .item { padding: 0; }
  .head { display: flex; justify-content: space-between; width: 100%; text-align: left; background: transparent; border: 0; padding: 14px 16px; font-weight: 600; }
  .body { padding: 0 16px 16px; }
  .gal { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; padding: 0 8px 8px; }
</style>
