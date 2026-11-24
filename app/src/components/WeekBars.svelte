<script lang="ts">
  import type { WeekStat } from '../lib/progress';

  let { weeks }: { weeks: WeekStat[] } = $props();

  const W = 340;
  const H = 150;
  const PAD_B = 20;
  const PAD_T = 8;
  const GAP = 2;
  let max = $derived(Math.max(60, ...weeks.map((w) => w.strengthMin + w.enduranceMin)));
  let bw = $derived(W / weeks.length);
  const h = (m: number) => (m / max) * (H - PAD_T - PAD_B);
  let hover = $state<number | null>(null);
  const fmtWeek = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });

  /** Balken mit 4px runder Oberkante, unten am Nullpunkt gerade. */
  function bar(x: number, yTop: number, w: number, hh: number, roundTop: boolean): string {
    if (hh <= 0) return '';
    const r = roundTop ? Math.min(4, hh, w / 2) : 0;
    const yb = yTop + hh;
    return `M${x},${yb}V${yTop + r}${r ? `Q${x},${yTop} ${x + r},${yTop}H${x + w - r}Q${x + w},${yTop} ${x + w},${yTop + r}` : `H${x + w}`}V${yb}Z`;
  }
  let hw = $derived(hover !== null ? weeks[hover] : null);
</script>

<div class="legend small">
  <span><i class="sw s1"></i>Kraft</span><span><i class="sw s2"></i>Ausdauer</span>
</div>
<div class="chart">
  <svg viewBox="0 0 {W} {H}" role="img" aria-label="Trainingsminuten pro Woche, letzte {weeks.length} Wochen" onpointerleave={() => (hover = null)}>
    <line x1="0" x2={W} y1={H - PAD_B} y2={H - PAD_B} class="base" />
    {#each weeks as w, i (w.weekStart)}
      {@const x = i * bw + bw * 0.18}
      {@const ww = bw * 0.64}
      {@const hs = h(w.strengthMin)}
      {@const he = h(w.enduranceMin)}
      {@const base = H - PAD_B}
      <path d={bar(x, base - hs, ww, hs, he <= 0)} class="s1" />
      <path d={bar(x, base - hs - he - (hs > 0 && he > 0 ? GAP : 0), ww, he, true)} class="s2" />
      {#if i % 3 === 2 || i === weeks.length - 1}
        <text x={x + ww / 2} y={H - 6} class="axis" text-anchor="middle">{fmtWeek(w.weekStart)}</text>
      {/if}
      <rect x={i * bw} y="0" width={bw} height={H} fill="transparent" role="presentation"
        onpointerenter={() => (hover = i)} onpointerdown={() => (hover = i)} />
    {/each}
  </svg>
  {#if hw && hover !== null}
    <div class="tip" style="left: {Math.min(62, Math.max(0, (hover / weeks.length) * 100 - 15))}%">
      <b>Woche ab {fmtWeek(hw.weekStart)}</b><br />
      Kraft {hw.strengthMin} min · Ausdauer {hw.enduranceMin} min<br />
      {hw.hardSets} harte Sätze{hw.planned ? ` · ${hw.done}/${hw.planned} geplant erledigt` : ''}
    </div>
  {/if}
</div>
<details class="small">
  <summary>Als Tabelle</summary>
  <table>
    <thead><tr><th>Woche</th><th>Kraft</th><th>Ausdauer</th><th>Sätze</th><th>Erledigt</th></tr></thead>
    <tbody>
      {#each [...weeks].reverse() as w (w.weekStart)}
        <tr><td>{fmtWeek(w.weekStart)}</td><td>{w.strengthMin}</td><td>{w.enduranceMin}</td><td>{w.hardSets}</td><td>{w.planned ? `${w.done}/${w.planned}` : '–'}</td></tr>
      {/each}
    </tbody>
  </table>
</details>

<style>
  .chart { position: relative; touch-action: pan-y; }
  svg { width: 100%; height: auto; display: block; overflow: visible; }
  .base { stroke: var(--line); }
  .axis { fill: var(--muted); font-size: 11px; }
  path.s1 { fill: var(--series-1); }
  path.s2 { fill: var(--series-2); }
  .legend { display: flex; gap: 14px; margin-bottom: 6px; color: var(--text); }
  .sw { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 5px; vertical-align: -1px; }
  .sw.s1 { background: var(--series-1); }
  .sw.s2 { background: var(--series-2); }
  .tip {
    position: absolute; top: -6px; transform: translateY(-100%); background: var(--surface); border: 1px solid var(--line);
    border-radius: 8px; padding: 4px 8px; font-size: 12px; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  }
  details { margin-top: 4px; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; color: var(--text); }
  th, td { text-align: left; padding: 3px 4px; border-bottom: 1px solid var(--line); font-weight: 400; }
  th { color: var(--muted); }
</style>
