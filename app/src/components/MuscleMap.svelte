<script lang="ts">
  import { MUSCLE_LABELS } from '../lib/exercises';
  import type { Muscle } from '../lib/types';

  let { muscles }: { muscles: Partial<Record<Muscle, number>> } = $props();

  const lvl = (m: Muscle) => {
    const w = muscles[m] ?? 0;
    return w >= 1 ? 'main' : w > 0 ? 'help' : 'off';
  };
  let main = $derived((Object.keys(muscles) as Muscle[]).filter((m) => (muscles[m] ?? 0) >= 1).map((m) => MUSCLE_LABELS[m]));
  let help = $derived((Object.keys(muscles) as Muscle[]).filter((m) => (muscles[m] ?? 0) > 0 && (muscles[m] ?? 0) < 1).map((m) => MUSCLE_LABELS[m]));

  const F = 55; // Mitte Vorderansicht
  const B = 165; // Mitte Rückansicht
  const torso = (cx: number) => `M${cx - 22},36 Q${cx},31 ${cx + 22},36 L${cx + 28},45 L${cx + 21},98 L${cx + 23},113 L${cx - 23},113 L${cx - 21},98 L${cx - 28},45 Z`;
  const lat = (cx: number, s: number) => `M${cx + s * 9},58 L${cx + s * 24},50 L${cx + s * 20},84 L${cx + s * 8},92 Z`;
</script>

<div class="mm">
  <svg viewBox="0 0 220 206" role="img" aria-label="Beanspruchte Muskeln: {main.join(', ')}{help.length ? `; mitarbeitend: ${help.join(', ')}` : ''}">
    {#each [F, B] as cx (cx)}
      <g class="body">
        <circle cx={cx} cy="18" r="11" />
        <rect x={cx - 5} y="27" width="10" height="9" />
        <path d={torso(cx)} />
        {#each [1, -1] as s (s)}
          <line x1={cx + s * 27} y1="43" x2={cx + s * 32} y2="80" stroke-width="11" />
          <line x1={cx + s * 32} y1="80" x2={cx + s * 36} y2="116" stroke-width="8.5" />
          <circle cx={cx + s * 37} cy="123" r="5" />
          <line x1={cx + s * 11} y1="112" x2={cx + s * 13} y2="153" stroke-width="18" />
          <line x1={cx + s * 13} y1="153" x2={cx + s * 12} y2="190" stroke-width="12" />
          <ellipse cx={cx + s * 14} cy="195" rx="7" ry="3.5" />
        {/each}
      </g>
    {/each}

    <!-- Vorderansicht -->
    {#each [1, -1] as s (s)}
      <ellipse cx={F + s * 26} cy="47" rx="7.5" ry="8" class={lvl('shoulders')} />
      <ellipse cx={F + s * 11} cy="53" rx="11" ry="8" class={lvl('chest')} />
      <ellipse cx={F + s * 30.5} cy="63" rx="4.5" ry="10" transform="rotate({-s * 8} {F + s * 30.5} 63)" class={lvl('biceps')} />
      <ellipse cx={F + s * 12} cy="132" rx="8" ry="18" class={lvl('quads')} />
    {/each}
    <rect x={F - 9} y="64" width="18" height="33" rx="6" class={lvl('core')} />

    <!-- Rückansicht -->
    <path d="M{B},34 L{B + 18},42 L{B + 9},60 L{B},70 L{B - 9},60 L{B - 18},42 Z" class={lvl('upperBack')} />
    {#each [1, -1] as s (s)}
      <ellipse cx={B + s * 26} cy="47" rx="7.5" ry="8" class={lvl('shoulders')} />
      <path d={lat(B, s)} class={lvl('lats')} />
      <ellipse cx={B + s * 30.5} cy="63" rx="4.5" ry="10" transform="rotate({-s * 8} {B + s * 30.5} 63)" class={lvl('triceps')} />
      <ellipse cx={B + s * 10} cy="113" rx="10.5" ry="9" class={lvl('glutes')} />
      <ellipse cx={B + s * 12} cy="139" rx="7" ry="15" class={lvl('hamstrings')} />
      <ellipse cx={B + s * 12.5} cy="167" rx="5.5" ry="11" class={lvl('calves')} />
    {/each}
    <rect x={B - 7} y="76" width="14" height="24" rx="5" class={lvl('core')} />

    <text x={F} y="205" class="lbl">vorn</text>
    <text x={B} y="205" class="lbl">hinten</text>
  </svg>
  <p class="small legend">
    <span><i class="sw main"></i><b>{main.join(', ')}</b></span>
    {#if help.length}<span><i class="sw help"></i>mitarbeitend: {help.join(', ')}</span>{/if}
  </p>
</div>

<style>
  .mm svg { display: block; width: 100%; max-width: 320px; margin: 0 auto; }
  .body circle, .body rect, .body path, .body ellipse { fill: var(--surface-2); }
  .body line { stroke: var(--surface-2); stroke-linecap: round; }
  .off { fill: var(--line); opacity: 0.55; }
  .main { fill: var(--series-2); }
  .help { fill: var(--series-2); opacity: 0.4; }
  .lbl { font-size: 10px; fill: var(--muted); text-anchor: middle; }
  .legend { display: flex; flex-direction: column; gap: 2px; margin: 6px 0 0; }
  .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; background: var(--series-2); }
  .sw.help { opacity: 0.4; }
</style>
