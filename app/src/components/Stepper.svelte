<script lang="ts">
  interface Props { value: number; min?: number; max?: number; label: string }
  let { value = $bindable(), min = 0, max = 100, label }: Props = $props();
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
</script>

<div class="stepper" role="group" aria-label={label}>
  <button type="button" aria-label="{label} verringern" onclick={() => (value = clamp(value - 1))}>−</button>
  <input type="number" inputmode="numeric" aria-label={label} bind:value onfocus={(e) => e.currentTarget.select()} onblur={() => (value = clamp(Number(value) || 0))} />
  <button type="button" aria-label="{label} erhöhen" onclick={() => (value = clamp(value + 1))}>+</button>
</div>

<style>
  .stepper { display: grid; grid-template-columns: 64px 1fr 64px; gap: 8px; }
  button { font-size: 28px; min-height: 64px; padding: 0; }
  input { text-align: center; font-size: 32px; font-weight: 700; min-height: 64px; font-variant-numeric: tabular-nums; }
</style>
