<script lang="ts">
  import { onMount } from 'svelte';
  import { fmt } from '../lib/derive';
  import {
    criticalSpeed, currentFtp, distribution, durationStr, efficiencyTrend, latestTest, longestRun, monotonyHint,
    paceStr, predictTime, SPORT_LABELS, suggest, TEST_LABELS, testDue, TYPE_LABELS, weeklyIncreaseHint,
    whoMinutes, within, zones, load, strengthMinutes, type Suggestion, type Zones
  } from '../lib/endurance';
  import { deleteEndurance, listEndurance, listTests } from '../lib/enduranceStore';
  import { recentSessions } from '../lib/training';
  import { todayReadiness } from '../lib/checkinStore';
  import { app } from '../lib/state.svelte';
  import { describePlanned } from '../lib/endurance';
  import { getWeek } from '../lib/weekStore';
  import { todayKey } from '../lib/readiness';
  import type { PlannedItem } from '../lib/types';
  import type { Readiness } from '../lib/readiness';
  import type { EnduranceSession, EnduranceTest, Profile, Sport, StrengthSession, TestKind } from '../lib/types';
  import EnduranceLog from './EnduranceLog.svelte';
  import TestForm from './TestForm.svelte';

  let { profile }: { profile: Profile } = $props();

  let sessions = $state<EnduranceSession[]>([]);
  let tests = $state<EnduranceTest[]>([]);
  let strength = $state<StrengthSession[]>([]);
  let ready = $state<Readiness | null>(null);
  let planned = $state<PlannedItem | null>(null);
  let deloadWeek = $state(false);
  let mode = $state<'main' | 'log' | 'test'>('main');
  let testKind = $state<TestKind>('cs');
  let prefill = $state<{ sport: Sport; type: Suggestion['type']; minutes: number } | undefined>(undefined);

  // svelte-ignore state_referenced_locally
  const sports: Sport[] = (['run', 'bikeOutdoor', 'bikeIndoor'] as Sport[]).filter((s) =>
    s === 'run' ? profile.endurance.runOutdoor : s === 'bikeOutdoor' ? profile.endurance.bikeOutdoor : profile.endurance.bikeIndoor);
  let sport = $state<Sport>(sports[0] ?? 'run');
  // svelte-ignore state_referenced_locally
  let minutes = $state(Math.max(30, profile.availability.typicalMinutes));
  // svelte-ignore state_referenced_locally
  const minuteOptions = [...new Set([30, 45, 60, 90, profile.availability.typicalMinutes])].filter((m) => m >= 20).sort((a, b) => a - b);

  async function refresh() {
    sessions = await listEndurance(profile.id);
    tests = await listTests(profile.id);
    strength = await recentSessions(profile.id, 14);
    ready = await todayReadiness(profile);
    const w = await getWeek(profile);
    deloadWeek = w.deload;
    planned = app.plannedEndurance ?? w.days.find((x) => x.date === todayKey())?.items.find((x) => x.kind === 'endurance') ?? null;
    app.plannedEndurance = null;
  }
  onMount(refresh);

  let plannedSug = $derived(planned?.sport && planned.type ? describePlanned(profile, planned.sport, planned.type, planned.minutes, sessions, tests, ready?.caps, deloadWeek) : null);
  let sug = $derived(suggest(profile, sport, minutes, sessions, strength, tests, new Date(), ready?.caps));
  let lr = $derived(longestRun(sessions, profile));
  let cs = $derived.by(() => { const t = latestTest(tests, 'cs'); return t ? criticalSpeed(t) : null; });
  let ftp = $derived(currentFtp(tests));
  let effRun = $derived(efficiencyTrend(sessions, 'run'));
  let effBike = $derived(efficiencyTrend(sessions, 'bikeIndoor'));
  let week = $derived(within(sessions, 7));
  let who = $derived(whoMinutes(week, profile, tests));
  let strengthDays = $derived(new Set(strength.filter((s) => s.status === 'done' && Date.now() - new Date(s.startedAt).getTime() < 7 * 86400000).map((s) => s.startedAt.slice(0, 10))).size);
  let dist = $derived(distribution(within(sessions, 14), profile, tests));
  let hints = $derived.by(() => {
    const out: string[] = [];
    const inc = weeklyIncreaseHint(sessions);
    if (inc) out.push(inc);
    const daily = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const e = sessions.filter((s) => s.date.slice(0, 10) === day).reduce((t, s) => t + load(s.sRpe, s.durationMin), 0);
      const k = strength.filter((s) => s.status === 'done' && s.startedAt.slice(0, 10) === day).reduce((t, s) => t + load(s.sRpe ?? 5, strengthMinutes(s)), 0);
      return e + k;
    });
    const prev = sessions.filter((s) => { const a = Date.now() - new Date(s.date).getTime(); return a >= 7 * 86400000 && a < 14 * 86400000; })
      .reduce((t, s) => t + load(s.sRpe, s.durationMin), 0);
    const m = monotonyHint(daily, prev);
    if (m) out.push(m);
    return out;
  });

  function openLog(fromSuggestion: boolean, from: Suggestion = sug) {
    prefill = fromSuggestion ? { sport: from.sport, type: from.type, minutes: from.minutes } : undefined;
    mode = 'log';
    window.scrollTo(0, 0);
  }
  function openTest(k: TestKind) {
    testKind = k;
    mode = 'test';
    window.scrollTo(0, 0);
  }
  async function closed(saved: boolean) {
    mode = 'main';
    if (saved) await refresh();
    window.scrollTo(0, 0);
  }
  async function remove(s: EnduranceSession) {
    if (!confirm(`${SPORT_LABELS[s.sport]} vom ${new Date(s.date).toLocaleDateString('de-DE')} löschen?`)) return;
    await deleteEndurance(s.id);
    await refresh();
  }

  function zoneRows(z: Zones, sp: Sport): [string, string][] {
    const rows: [string, string][] = [];
    const e: string[] = [];
    if (z.easy.paceSec) e.push(`langsamer als ${paceStr(z.easy.paceSec)}`);
    if (z.easy.power) e.push(`< ${z.easy.power} W`);
    if (z.easy.hr) e.push(`Puls < ${z.easy.hr}`);
    rows.push(['Locker', e.join(' · ') || 'ganze Sätze sprechbar']);
    const t: string[] = [];
    if (z.tempo.paceSec) t.push(`${paceStr(z.tempo.paceSec[0]).replace(' /km', '')}–${paceStr(z.tempo.paceSec[1])}`);
    if (z.tempo.power) t.push(`${z.tempo.power[0]}–${z.tempo.power[1]} W`);
    if (z.tempo.hr) t.push(`Puls ${z.tempo.hr[0]}–${z.tempo.hr[1]}`);
    rows.push(['Tempo', t.join(' · ')]);
    const i: string[] = [];
    if (z.intervals.paceSec) i.push(`${paceStr(z.intervals.paceSec[0]).replace(' /km', '')}–${paceStr(z.intervals.paceSec[1])}`);
    if (z.intervals.power) i.push(`${z.intervals.power[0]}–${z.intervals.power[1]} W`);
    if (z.intervals.hr) i.push(`Puls > ${z.intervals.hr}`);
    rows.push(['Intervalle', i.join(' · ')]);
    void sp;
    return rows;
  }
  const ZONE_ROWS: [string, 0 | 1 | 2, string][] = [['Locker', 0, '75–85 %'], ['Schwelle', 1, '10–20 %'], ['Hoch', 2, '5–10 %']];
  const testKinds = $derived((['cs', 'talkRun', 'ftp20', 'talkBike'] as TestKind[]).filter((k) =>
    k === 'cs' || k === 'talkRun' ? sports.includes('run') : k === 'ftp20' ? profile.endurance.bikeIndoor && profile.endurance.bikeIndoorPower : sports.some((s) => s !== 'run')));
</script>

{#if mode === 'log'}
  <EnduranceLog {profile} history={sessions} {prefill} {sports} onclose={closed} />
{:else if mode === 'test'}
  <TestForm {profile} kind={testKind} onclose={closed} />
{:else}
<main>
  <h1>Ausdauer</h1>

  {#if sports.length === 0}
    <div class="card warn"><p class="small">Im Profil (Ausdauer) ist keine Sportart aktiv.</p></div>
  {:else}
  {#if plannedSug}
    <div class="card planned">
      <h3>Heute geplant</h3>
      <p class="small muted">{SPORT_LABELS[plannedSug.sport]} · {TYPE_LABELS[plannedSug.type]} · {plannedSug.minutes} min{plannedSug.maxKm ? ` · max. ${fmt(plannedSug.maxKm)} km` : ''}</p>
      <h2>{plannedSug.title}</h2>
      <ul class="small">{#each plannedSug.structure as x (x)}<li>{x}</li>{/each}</ul>
      {#if plannedSug.target}<p class="small target">{plannedSug.target}</p>{/if}
      {#each plannedSug.why as w (w)}<p class="small muted">{w}</p>{/each}
      {#if plannedSug.minutes > 0}<button class="primary block" onclick={() => openLog(true, plannedSug!)}>Erledigt – eintragen</button>{/if}
    </div>
  {/if}

  <div class="card">
    <h3>{plannedSug ? 'Andere Einheit – Vorschlag' : 'Vorschlag'}</h3>
    <div class="chips">
      {#each sports as sp (sp)}<button class:on={sport === sp} onclick={() => (sport = sp)}>{SPORT_LABELS[sp]}</button>{/each}
    </div>
    <div class="chips">
      {#each minuteOptions as m (m)}<button class:on={minutes === m} onclick={() => (minutes = m)}>{m} min</button>{/each}
    </div>
    <div class="sug">
      <p class="small muted">{SPORT_LABELS[sug.sport]} · {TYPE_LABELS[sug.type]} · {sug.minutes} min{sug.maxKm ? ` · max. ${fmt(sug.maxKm)} km` : ''}</p>
      <h2>{sug.title}</h2>
      <ul class="small">{#each sug.structure as x (x)}<li>{x}</li>{/each}</ul>
      <p class="small target">{sug.target}</p>
      {#each sug.why as w (w)}<p class="small muted">{w}</p>{/each}
    </div>
    {#if sug.minutes > 0}<button class="primary block" onclick={() => openLog(true)}>Erledigt – eintragen</button>{/if}
  </div>
  <button class="block" onclick={() => openLog(false)}>Andere Einheit eintragen</button>

  {#each hints as h (h)}<div class="card warn"><p class="small">{h}</p></div>{/each}

  <h2>Diese Woche</h2>
  <div class="grid2">
    <div class="card">
      <div class="stat-label">WHO-Minuten (7 Tage)</div>
      <div class="stat">{who}<span class="small muted"> / 150</span></div>
      <div class="small muted">intensiv zählt doppelt</div>
    </div>
    <div class="card">
      <div class="stat-label">Krafttage (7 Tage)</div>
      <div class="stat">{strengthDays}<span class="small muted"> / 2</span></div>
      <div class="small muted">WHO-Minimum</div>
    </div>
  </div>
  <div class="card">
    <div class="stat-label">Intensitätsverteilung (14 Tage)</div>
    {#each ZONE_ROWS as [label, i, goal] (label)}
      {@const pct = Math.round((dist.share[i] ?? 0) * 100)}
      <div class="vol">
        <span class="small">{label}</span>
        <div class="bar"><div style="width: {pct}%"></div></div>
        <span class="small num">{pct} %</span>
      </div>
      <div class="small muted goal">Ziel {goal}</div>
    {/each}
  </div>

  <h2>Kennzahlen</h2>
  <div class="grid2">
    {#if sports.includes('run')}
      <div class="card">
        <div class="stat-label">Längster Lauf (30 Tage)</div>
        <div class="stat">{fmt(lr.km)} km</div>
        <div class="small muted">nächster max. {fmt(lr.km > 0 ? lr.km * 1.1 : 5)} km{lr.seeded ? ' (Startwert)' : ''}</div>
      </div>
      <div class="card">
        <div class="stat-label">Critical Speed</div>
        {#if cs}
          <div class="stat">{paceStr(1000 / cs.cs).replace(' /km', '')}<span class="small muted"> /km</span></div>
          <div class="small muted">5 km ≈ {durationStr(predictTime(cs.cs, cs.dPrime, 5000))}</div>
        {:else}<div class="small muted">noch kein Test</div>{/if}
      </div>
    {/if}
    {#if profile.endurance.bikeIndoor && profile.endurance.bikeIndoorPower}
      <div class="card">
        <div class="stat-label">FTP (Rolle)</div>
        {#if ftp}<div class="stat">{ftp} W</div><div class="small muted">{fmt(ftp / profile.weightKg, 2)} W/kg</div>
        {:else}<div class="small muted">noch kein Test</div>{/if}
      </div>
    {/if}
    {#if sports.includes('run')}
      <div class="card">
        <div class="stat-label">Aerobe Effizienz Laufen</div>
        {#if effRun}<div class="stat" class:up={effRun.pct > 0}>{effRun.pct > 0 ? '+' : ''}{fmt(effRun.pct)} %</div><div class="small muted">vs. 4 Wochen davor</div>
        {:else}<div class="small muted">braucht lockere Läufe mit Puls über 8 Wochen</div>{/if}
      </div>
    {/if}
    {#if profile.endurance.bikeIndoorPower}
      <div class="card">
        <div class="stat-label">Watt pro Puls (Rolle)</div>
        {#if effBike}<div class="stat" class:up={effBike.pct > 0}>{effBike.pct > 0 ? '+' : ''}{fmt(effBike.pct)} %</div><div class="small muted">vs. 4 Wochen davor</div>
        {:else}<div class="small muted">braucht lockere Rolleneinheiten mit Watt + Puls</div>{/if}
      </div>
    {/if}
  </div>

  <h2>Deine Zonen</h2>
  {#each sports as sp (sp)}
    {@const z = zones(profile, tests, sp)}
    <details class="card">
      <summary><b>{SPORT_LABELS[sp]}</b> <span class="small muted">· Basis: {z.easy.source}</span></summary>
      <ul class="list">
        {#each zoneRows(z, sp) as [k, v] (k)}<li class="small"><b>{k}</b><br />{v}</li>{/each}
      </ul>
    </details>
  {/each}

  <h2>Feldtests</h2>
  <p class="small muted">Alle 6–8 Wochen, ausgeruht. Sie machen deine Zonen genauer als jede Formel.</p>
  {#each testKinds as k (k)}
    {@const last = latestTest(tests, k)}
    <button class="test" onclick={() => openTest(k)}>
      <span><b>{TEST_LABELS[k]}</b><br /><span class="small muted">{last ? `zuletzt ${new Date(last.date).toLocaleDateString('de-DE')}` : 'noch nie'}</span></span>
      {#if testDue(tests, k)}<span class="due">fällig</span>{/if}
    </button>
  {/each}

  {#if sessions.length}
    <h2>Verlauf</h2>
    <ul class="list card">
      {#each sessions.slice(0, 15) as s (s.id)}
        <li class="hist">
          <span>
            <b>{SPORT_LABELS[s.sport]} · {TYPE_LABELS[s.type]}</b><br />
            <span class="small muted">{new Date(s.date).toLocaleDateString('de-DE')} · {s.durationMin} min{s.distanceKm ? ` · ${fmt(s.distanceKm)} km` : ''}{s.avgHr ? ` · ♥ ${s.avgHr}` : ''}{s.avgPower ? ` · ${s.avgPower} W` : ''} · RPE {s.sRpe}</span>
          </span>
          <button class="ghost" aria-label="Löschen" onclick={() => remove(s)}>✕</button>
        </li>
      {/each}
    </ul>
  {/if}
  {/if}
</main>
{/if}

<style>
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
  .chips button { border: 1.5px solid var(--line); background: var(--surface); font-weight: 500; padding: 8px 12px; min-height: 40px; font-size: 15px; }
  .chips button.on { border-color: var(--accent); background: var(--accent-soft); font-weight: 650; }
  .sug h2, .planned h2 { margin: 4px 0 6px; }
  .planned ul { padding-left: 20px; margin: 6px 0; }
  .planned { border: 1.5px solid var(--accent); }
  .sug ul { padding-left: 20px; margin: 6px 0; }
  .target { font-weight: 600; color: var(--accent); }
  .vol { display: grid; grid-template-columns: 80px 1fr 44px; gap: 8px; align-items: center; margin-top: 8px; }
  .bar { height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
  .bar div { height: 100%; background: var(--accent); border-radius: 4px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .goal { margin-left: 88px; font-size: 12px; }
  .up { color: var(--accent); }
  details summary { cursor: pointer; }
  details .list { margin-top: 8px; }
  .test {
    width: 100%; display: flex; justify-content: space-between; align-items: center; text-align: left;
    background: var(--surface); border: 1px solid var(--line); margin: 8px 0; font-weight: 400;
  }
  .due { background: var(--warn-soft); color: var(--warn); font-size: 13px; font-weight: 600; padding: 3px 10px; border-radius: 10px; }
  .hist { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
</style>
