<script lang="ts">
  // Reserve (RIR) per Tipp auf ein Gesicht statt Zahl – schneller und intuitiver (M7)
  let { value = $bindable(), max = 4 }: { value: number; max?: number } = $props();
  const FACES = [
    { v: 0, face: '😵', label: 'nichts mehr' },
    { v: 1, face: '😣', label: '1 mehr' },
    { v: 2, face: '😤', label: '2 mehr' },
    { v: 3, face: '🙂', label: '3 mehr' },
    { v: 4, face: '😄', label: '4+ mehr' }
  ];
</script>

<div class="faces" role="radiogroup" aria-label="Wie viele hättest du noch geschafft?">
  {#each FACES.filter((f) => f.v <= max) as f (f.v)}
    <button type="button" role="radio" aria-checked={value === f.v} class:on={value === f.v} onclick={() => (value = f.v)}>
      <span class="f" aria-hidden="true">{f.face}</span><span class="l">{f.label}</span>
    </button>
  {/each}
</div>

<style>
  .faces { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  button { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 2px; border: 1.5px solid var(--line); background: var(--surface); min-height: 64px; }
  button.on { border-color: var(--accent); background: var(--accent-soft); }
  .f { font-size: 26px; line-height: 1; }
  .l { font-size: 11px; color: var(--muted); font-weight: 600; white-space: nowrap; }
  button.on .l { color: var(--text); }
</style>
