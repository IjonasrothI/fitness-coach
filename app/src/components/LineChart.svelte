<script lang="ts">
  import type { Point } from '../lib/progress';
  import { smooth } from '../lib/progress';

  let {
    points, label, format = (v: number) => v.toLocaleString('de-DE', { maximumFractionDigits: 1 }),
    height = 140, compact = false, minNoise = 0, minRange = 0
  }: {
    points: Point[]; label: string; format?: (v: number) => string; height?: number; compact?: boolean; minNoise?: number;
    /** kleinste dargestellte Spanne der y-Achse – verhindert, dass Messrauschen riesig wirkt */
    minRange?: number;
  } = $props();

  const W = 340;
  let H = $derived(compact ? 64 : height);
  const PAD_L = 4;
  const PAD_R = 4;
  let padT = $derived(compact ? 6 : 10);
  let padB = $derived(compact ? 6 : 22);

  let sm = $derived(smooth(points, { minNoise }).series);
  let t0 = $derived(sm.length ? new Date(sm[0]!.date).getTime() : 0);
  let t1 = $derived(sm.length ? new Date(sm[sm.length - 1]!.date).getTime() : 1);
  let range = $derived.by(() => {
    const vals = sm.flatMap((p) => [p.value, p.est]);
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    const need = Math.max(minRange, 1e-6);
    if (hi - lo < need) { const mid = (hi + lo) / 2; lo = mid - need / 2; hi = mid + need / 2; }
    const pad = (hi - lo) * 0.12;
    return [lo - pad, hi + pad] as const;
  });
  const x = (d: string) => PAD_L + ((new Date(d).getTime() - t0) / Math.max(1, t1 - t0)) * (W - PAD_L - PAD_R);
  const y = (v: number) => padT + (1 - (v - range[0]) / (range[1] - range[0])) * (H - padT - padB);
  let path = $derived(sm.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.est).toFixed(1)}`).join(''));
  let grid = $derived([0.25, 0.5, 0.75].map((f) => range[0] + f * (range[1] - range[0])));

  let hover = $state<number | null>(null);
  let svgEl: SVGSVGElement | undefined = $state();
  function onMove(e: PointerEvent) {
    if (!svgEl || !sm.length) return;
    const r = svgEl.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    sm.forEach((p, i) => { if (Math.abs(x(p.date) - px) < Math.abs(x(sm[best]!.date) - px)) best = i; });
    hover = best;
  }
  const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric', year: '2-digit' });
  let hp = $derived(hover !== null ? sm[hover] : null);
</script>

{#if sm.length >= 2}
  <div class="chart" class:compact>
    <svg
      bind:this={svgEl} viewBox="0 0 {W} {H}" role="img" aria-label="{label}: {sm.length} Messungen, zuletzt {format(sm[sm.length - 1]!.est)}"
      onpointermove={onMove} onpointerdown={onMove} onpointerleave={() => (hover = null)}
    >
      {#if !compact}
        {#each grid as g (g)}
          <line x1={PAD_L} x2={W - PAD_R} y1={y(g)} y2={y(g)} class="grid" />
          <text x={PAD_L} y={y(g) - 3} class="axis">{format(g)}</text>
        {/each}
        <text x={PAD_L} y={H - 6} class="axis">{fmtDate(sm[0]!.date)}</text>
        <text x={W - PAD_R} y={H - 6} class="axis" text-anchor="end">{fmtDate(sm[sm.length - 1]!.date)}</text>
      {/if}
      {#each sm as p (p.date)}
        <circle cx={x(p.date)} cy={y(p.value)} r={compact ? 2 : 3} class="raw" />
      {/each}
      <path d={path} class="line" />
      {#if hp}
        <line x1={x(hp.date)} x2={x(hp.date)} y1={padT} y2={H - padB} class="cross" />
        <circle cx={x(hp.date)} cy={y(hp.est)} r="4.5" class="dot" />
      {/if}
      <rect x="0" y="0" width={W} height={H} fill="transparent" />
    </svg>
    {#if hp}
      <div class="tip" style="left: {Math.min(70, Math.max(0, (x(hp.date) / W) * 100 - 15))}%">
        <b>{fmtDate(hp.date)}</b><br />gemessen {format(hp.value)} · Trend {format(hp.est)}
      </div>
    {/if}
  </div>
  {#if !compact}
    <details class="small">
      <summary>Als Tabelle</summary>
      <table>
        <thead><tr><th>Datum</th><th>Wert</th><th>Trend</th></tr></thead>
        <tbody>{#each [...sm].reverse() as p (p.date)}<tr><td>{fmtDate(p.date)}</td><td>{format(p.value)}</td><td>{format(p.est)}</td></tr>{/each}</tbody>
      </table>
    </details>
  {/if}
{:else}
  <p class="small muted">{label}: noch zu wenige Werte für eine Kurve.</p>
{/if}

<style>
  .chart { position: relative; touch-action: pan-y; }
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  .grid { stroke: var(--line); stroke-width: 1; }
  .axis { fill: var(--muted); font-size: 11px; }
  .raw { fill: var(--muted); opacity: 0.45; }
  .line { fill: none; stroke: var(--series-1); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .cross { stroke: var(--muted); stroke-width: 1; stroke-dasharray: 3 3; }
  .dot { fill: var(--series-1); stroke: var(--surface); stroke-width: 2; }
  .tip {
    position: absolute; top: -6px; transform: translateY(-100%); background: var(--surface); border: 1px solid var(--line);
    border-radius: 8px; padding: 4px 8px; font-size: 12px; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  details { margin-top: 4px; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; color: var(--text); }
  th, td { text-align: left; padding: 3px 4px; border-bottom: 1px solid var(--line); font-weight: 400; }
  th { color: var(--muted); }
</style>
