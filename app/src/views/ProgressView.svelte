<script lang="ts">
  import { onMount } from 'svelte';
  import LineChart from '../components/LineChart.svelte';
  import WeekBars from '../components/WeekBars.svelte';
  import { fmt } from '../lib/derive';
  import { paceStr, SPORT_LABELS } from '../lib/endurance';
  import { PATTERNS } from '../lib/exercises';
  import { trend, type Point, type Trend } from '../lib/progress';
  import { loadProgress, type ProgressData } from '../lib/progressStore';
  import { app } from '../lib/state.svelte';
  import { stepLabel } from '../lib/strength';
  import type { PatternId, Profile } from '../lib/types';

  let { profile }: { profile: Profile } = $props();
  let data = $state<ProgressData | null>(null);
  // svelte-ignore state_referenced_locally
  let weight = $state(profile.weightKg);
  let savedWeight = $state(false);

  onMount(async () => { data = await loadProgress(profile); });

  const TREND: Record<Trend, { icon: string; text: string }> = {
    up: { icon: '↑', text: 'steigt' }, flat: { icon: '→', text: 'stabil' }, down: { icon: '↓', text: 'fällt' }, unclear: { icon: '·', text: 'zu wenig Daten' }
  };
  const name = (pat: PatternId) => PATTERNS.find((x) => x.id === pat)?.name ?? pat;

  let patternRows = $derived.by(() => {
    if (!data) return [];
    return (Object.entries(data.patterns) as [PatternId, Point[]][])
      .map(([pat, pts]) => ({
        pat, pts, tr: trend(pts, 42, new Date(), { minNoise: 0.05 }).trend,
        step: data!.states.find((s) => s.pattern === pat)?.step
      }))
      .sort((a, b) => (PATTERNS.find((x) => x.id === a.pat)?.order ?? 0) - (PATTERNS.find((x) => x.id === b.pat)?.order ?? 0));
  });
  let effIndex = $derived.by(() => {
    if (!data?.efficiency.length) return [];
    const base = data.efficiency.slice(0, 3).reduce((a, p) => a + p.value, 0) / Math.min(3, data.efficiency.length);
    return data.efficiency.map((p) => ({ date: p.date, value: (p.value / base) * 100 }));
  });

  async function saveWeight() {
    if (!weight || weight < 30 || weight > 250) return;
    await app.save({ ...profile, weightKg: Math.round(weight * 10) / 10 });
    data = await loadProgress(profile);
    savedWeight = true;
  }
</script>

<main>
  <h1>Verlauf</h1>
  {#if !data}
    <p class="muted">Lade …</p>
  {:else}
    <div class="card">
      <div class="stats">
        <div><span class="stat">{data.streak}</span><span class="stat-label">Wochen in Folge dran</span></div>
        <div><span class="stat">{data.adherence === null ? '–' : `${Math.round(data.adherence * 100)} %`}</span><span class="stat-label">geplante Einheiten erledigt (7 Wochen)</span></div>
      </div>
      <p class="small muted">Eine ausgelassene Einheit pro Woche unterbricht die Serie nicht (F23).</p>
    </div>

    <h2>Trainingszeit pro Woche</h2>
    <div class="card"><WeekBars weeks={data.weeks} /></div>

    <h2>Kraft</h2>
    <div class="card" class:warn={data.strength.plateau} class:accent={!data.strength.plateau && data.strength.up.length > 0}>
      <p class="small"><b>{data.strength.plateau ? 'Plateau erkannt' : data.strength.up.length ? 'Du wirst stärker' : 'Kraftentwicklung'}</b></p>
      <p class="small">{data.strength.reason}</p>
      {#if data.strength.plateau}
        <p class="small muted">Du hast deinen nächsten Reiz noch nicht gefunden. Einzelne Übungen wechseln schon automatisch Stufe oder Technik; zum nächsten Block (nach der Entlastungswoche) steigt zusätzlich das Volumen um 2 Sätze je Muskel und Woche (K18).</p>
      {/if}
      {#if data.volumeBoost}<p class="small muted">Aktuell +{data.volumeBoost} Sätze je Muskel und Woche wegen eines früheren Plateaus.</p>{/if}
    </div>
    {#if patternRows.length}
      <p class="small muted">Niveau je Übungsmuster: Leiterstufe plus Position im Wiederholungsfenster. Linie = geglätteter Trend; erst ab dem 1,5-fachen Messfehler zählt eine Veränderung als echt (F16).</p>
      {#each patternRows as r (r.pat)}
        <div class="pattern">
          <div class="phead">
            <span><b>{name(r.pat)}</b><br /><span class="small muted">{r.step ? stepLabel(r.step, profile) : ''}</span></span>
            <span class="badge {r.tr}" title={TREND[r.tr].text}>{TREND[r.tr].icon} {TREND[r.tr].text}</span>
          </div>
          <LineChart points={r.pts} label={name(r.pat)} compact minNoise={0.05} minRange={1} />
        </div>
      {/each}
    {:else}
      <p class="small muted">Nach ein paar Krafteinheiten erscheint hier dein Verlauf je Übungsmuster.</p>
    {/if}

    <h2>Ausdauer</h2>
    <div class="card" class:warn={data.endurance.plateau}>
      <p class="small"><b>{data.endurance.plateau ? 'Plateau erkannt' : 'Ausdauerentwicklung'}</b></p>
      <p class="small">{data.endurance.reason}</p>
      {#each data.endurance.detail as dt (dt)}<p class="small muted">{dt}</p>{/each}
      {#if data.endurance.plateau}
        <p class="small muted">Du hast deinen nächsten Reiz noch nicht gefunden. Zum nächsten Block wechselt das Intervallformat – nur diese eine Änderung, damit sichtbar wird, was wirkt (F17).</p>
      {/if}
    </div>
    {#if data.sport}
      <h3>Aerobe Effizienz · {SPORT_LABELS[data.sport]}</h3>
      <p class="small muted">{data.sport === 'run' ? 'Tempo' : 'Leistung'} pro Herzschlag in lockeren Einheiten, Start = 100. Steigt die Kurve, bist du bei gleichem Puls schneller.</p>
      <div class="card"><LineChart points={effIndex} label="Aerobe Effizienz" format={(v) => fmt(v, 0)} minNoise={1} minRange={15} /></div>
    {:else}
      <p class="small muted">Trage bei lockeren Läufen Distanz und Ø-Puls ein (oder auf der Rolle Watt und Puls) – dann siehst du hier, ob du bei gleichem Puls schneller wirst.</p>
    {/if}
    {#if data.tests.cs.length >= 2}
      <h3>Kritische Geschwindigkeit (Feldtest)</h3>
      <div class="card"><LineChart points={data.tests.cs} label="Kritische Geschwindigkeit" format={(v) => paceStr(1000 / v)} minRange={0.2} /></div>
    {/if}
    {#if data.tests.ftp.length >= 2}
      <h3>FTP (Feldtest)</h3>
      <div class="card"><LineChart points={data.tests.ftp} label="FTP" format={(v) => `${Math.round(v)} W`} minRange={20} /></div>
    {/if}

    <h2>Körper</h2>
    {#if data.recovery}<div class="card warn"><p class="small">{data.recovery}</p></div>{/if}
    <h3>Ruhepuls</h3>
    {#if data.restingHr.length}
      <div class="card"><LineChart points={data.restingHr} label="Ruhepuls" format={(v) => `${Math.round(v)}`} minNoise={1} minRange={10} /></div>
    {:else}
      <p class="small muted">Optional im Morgen-Check eintragen – ein dauerhaft erhöhter Ruhepuls ist ein Ermüdungszeichen (F10).</p>
    {/if}
    <h3>Gewicht</h3>
    <div class="card">
      <LineChart points={data.weight} label="Gewicht" format={(v) => `${fmt(v)} kg`} minNoise={0.3} minRange={4} />
      <div class="row weight">
        <input type="number" inputmode="decimal" step="0.1" bind:value={weight} aria-label="Gewicht in kg" oninput={() => (savedWeight = false)} />
        <button onclick={saveWeight}>{savedWeight ? 'Gespeichert ✓' : 'Heute eintragen'}</button>
      </div>
      <p class="small muted">Einmal pro Woche morgens reicht – der Trend zählt, nicht der einzelne Tag.</p>
    </div>

    <h2>Was die App über dich gelernt hat</h2>
    <div class="card">
      <ul class="list">
        {#each data.learned as l (l.label)}
          <li><span class="small muted">{l.label}</span><br /><b>{l.value}</b> <span class="rule">{l.rule}</span></li>
        {/each}
      </ul>
      <p class="small muted">Diese Werte passen sich mit jeder Einheit, jedem Test und jedem Check-in an. Änderungen am Plan findest du mit „Rückgängig“ im Tab Woche.</p>
    </div>
  {/if}
</main>

<style>
  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .stats div { display: flex; flex-direction: column; }
  h3 { font-size: 16px; margin: 16px 0 6px; }
  .pattern { border-bottom: 1px solid var(--line); padding: 10px 0; }
  .phead { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
  .badge { font-size: 13px; font-weight: 600; white-space: nowrap; padding: 2px 8px; border-radius: 8px; background: var(--surface-2); color: var(--muted); }
  .badge.up { background: var(--accent-soft); color: var(--accent); }
  .badge.down { background: var(--warn-soft); color: var(--warn); }
  .weight { margin-top: 10px; align-items: center; }
  .weight input { max-width: 120px; }
  .rule { font-size: 12px; background: var(--surface-2); padding: 1px 6px; border-radius: 6px; }
</style>
