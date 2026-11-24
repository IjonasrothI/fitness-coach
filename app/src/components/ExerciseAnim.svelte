<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { canon, joints, poseAt, SEG, viewBox, type JointName, type Joints, type Prop, type Vec } from '../lib/figure';
  import { MOTIONS } from '../lib/motions';

  let { id, label = '', playing = $bindable(true), frame }: { id: string; label?: string; playing?: boolean; frame?: number } = $props();

  let m = $derived(MOTIONS[id]);
  let cs = $derived(m ? m.frames.map((f) => canon(f, m.front)) : []);
  let vb = $derived<[number, number, number, number]>(m ? viewBox(m, cs) : [0, 0, 4, 3]);
  let time = $state(0);
  let raf = 0;
  let last = 0;

  function loop(ts: number) {
    if (last && playing) time += Math.min(0.1, (ts - last) / 1000);
    last = ts;
    raf = requestAnimationFrame(loop);
  }
  onMount(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) playing = false;
    raf = requestAnimationFrame(loop);
  });
  onDestroy(() => cancelAnimationFrame(raf));
  // Neue Übung → von vorn
  $effect(() => { void id; time = 0; });

  let j = $derived<Joints | null>(m && cs.length ? joints(frame !== undefined ? cs[frame % cs.length]! : poseAt(m, cs, time), m.front) : null);
  const P = (v: Vec) => `${v[0].toFixed(1)},${v[1].toFixed(1)}`;
  const pt = (a: JointName | Vec): Vec => (Array.isArray(a) ? a : j![a]);
  // ferne Gliedmaßen leicht versetzt (Tiefe), in der Vorderansicht nicht
  let off = $derived<Vec>(m?.front ? [0, 0] : [1.5, -1.2]);
  const o = (v: Vec): Vec => [v[0] + off[0], v[1] + off[1]];

  function band(p: Extract<Prop, { k: 'band' }>): string {
    const a = pt(p.a);
    const b = pt(p.b);
    if (p.via) {
      // Band läuft über ein Gelenk (Rücken, Hüfte) und auf beiden Seiten nach unten
      const v = pt(p.via);
      const l: Vec = [v[0] - 3, v[1] - 3.5];
      const r: Vec = [v[0] + 3, v[1] - 3.5];
      const end: Vec = p.a === p.b ? [b[0] + 2, b[1]] : [v[0] + (v[0] - a[0]), a[1]];
      return `M${P(a)}L${P(l)}L${P(r)}L${P(end)}`;
    }
    return `M${P(a)}L${P(b)}`;
  }
</script>

{#if m && j}
  <button class="anim" type="button" onclick={() => (playing = !playing)} aria-label="{label ? `${label}: ` : ''}Animation {playing ? 'anhalten' : 'abspielen'}">
    <svg viewBox={vb.map((v) => v.toFixed(1)).join(' ')} role="img" aria-hidden="true">
      <line x1={vb[0]} x2={vb[0] + vb[2]} y1="0.8" y2="0.8" class="floor" />
      {#each m.props ?? [] as p, i (i)}
        {#if p.k === 'sofa'}
          {@const h = p.h ?? 24}
          <rect x={p.x} y={-h} width={p.w} height={h - 3} rx="3" class="prop" />
          <rect x={p.x + 2} y="-3" width="3" height="3" class="prop" /><rect x={p.x + p.w - 5} y="-3" width="3" height="3" class="prop" />
          {#if p.back}<rect x={p.back === 'left' ? p.x : p.x + p.w - 8} y={-h - 18} width="8" height="20" rx="3" class="prop" />{/if}
        {:else if p.k === 'step'}
          <rect x={p.x} y={-p.h} width={p.w} height={p.h} rx="1" class="prop" />
        {:else if p.k === 'table'}
          <rect x={p.x} y={-p.h - 2} width={p.w} height="3" rx="1" class="prop" />
          <rect x={p.x + 2} y={-p.h} width="3" height={p.h} class="prop" />
        {:else if p.k === 'wall'}
          <rect x={p.x} y={vb[1]} width="4" height={-vb[1]} class="prop" />
        {:else if p.k === 'post'}
          <rect x={p.x} y={-p.h} width="4" height={p.h} rx="1" class="prop" />
        {:else if p.k === 'cushion'}
          <rect x={p.x - 6} y="-2.5" width="12" height="3" rx="1.5" class="prop" />
        {/if}
      {/each}

      <!-- ferne Seite -->
      <g class="far">
        <polyline points="{P(o(j.hipF))} {P(o(j.kneeF))} {P(o(j.ankleF))}" />
        <polyline points="{P(o(j.heelF))} {P(o(j.toeF))}" class="foot" />
        <polyline points="{P(o(j.shF))} {P(o(j.elbowF))} {P(o(j.handF))}" />
      </g>
      <!-- Rumpf & Kopf -->
      <g class="near">
        {#if m.front}
          <line x1={j.shF[0]} y1={j.shF[1]} x2={j.shN[0]} y2={j.shN[1]} />
          <line x1={j.hipF[0]} y1={j.hipF[1]} x2={j.hipN[0]} y2={j.hipN[1]} />
        {/if}
        <line x1={j.hip[0]} y1={j.hip[1]} x2={j.sh[0]} y2={j.sh[1]} class="torso" />
        <circle cx={j.head[0]} cy={j.head[1]} r={SEG.head} class="head" />
        <polyline points="{P(j.hipN)} {P(j.kneeN)} {P(j.ankleN)}" />
        <polyline points="{P(j.heelN)} {P(j.toeN)}" class="foot" />
        <polyline points="{P(j.shN)} {P(j.elbowN)} {P(j.handN)}" />
      </g>

      {#each m.props ?? [] as p, i (i)}
        {#if p.k === 'band'}
          <path d={band(p)} class="band" />
        {:else if p.k === 'kb'}
          {@const c = pt(p.j)}
          {@const d = p.d ?? [0, 4]}
          <circle cx={c[0] + d[0]} cy={c[1] + d[1] + 1.5} r="4.2" class="kb" />
          <path d="M{c[0] + d[0] - 2.4},{c[1] + d[1] - 1.5}Q{c[0] + d[0]},{c[1] + d[1] - 5.5} {c[0] + d[0] + 2.4},{c[1] + d[1] - 1.5}" class="kbh" />
        {:else if p.k === 'db'}
          {@const c = pt(p.j)}
          <rect x={c[0] - 4} y={c[1] - 1.6} width="8" height="3.2" rx="1.2" class="kb" />
        {:else if p.k === 'towel'}
          {@const c = pt(p.j)}
          <rect x={c[0] - 5} y="-1.6" width="12" height="2" rx="1" class="towel" />
        {/if}
      {/each}
    </svg>
    {#if !playing}<span class="play" aria-hidden="true">▶</span>{/if}
  </button>
  {#if m.tempo && frame === undefined}<p class="tempo small muted">Tempo: {m.tempo}</p>{/if}
{/if}

<style>
  .anim { position: relative; display: block; width: 100%; padding: 0; border: 0; background: var(--surface-2); border-radius: 12px; overflow: hidden; min-height: 0; }
  svg { display: block; width: 100%; aspect-ratio: 4 / 3; max-height: 30vh; margin: 0 auto; }
  .floor { stroke: var(--line); stroke-width: 1.6; }
  .prop { fill: var(--surface); stroke: var(--muted); stroke-width: 0.8; opacity: 0.9; }
  polyline, line { fill: none; stroke-linecap: round; stroke-linejoin: round; }
  .near polyline, .near line { stroke: var(--accent); stroke-width: 4.6; }
  .near .torso { stroke-width: 7; }
  .head { fill: var(--accent); }
  .far polyline { stroke: var(--accent); stroke-width: 4.2; opacity: 0.4; }
  .foot { stroke-width: 3.6 !important; }
  .band { fill: none; stroke: var(--series-2); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .kb { fill: var(--text); }
  .kbh { fill: none; stroke: var(--text); stroke-width: 1.4; }
  .towel { fill: var(--series-1); opacity: 0.7; }
  .play { position: absolute; right: 10px; bottom: 8px; font-size: 18px; color: var(--muted); }
  .tempo { margin: 6px 0 0; }
</style>
