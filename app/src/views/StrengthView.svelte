<script lang="ts">
  import { onMount } from 'svelte';
  import { fmt } from '../lib/derive';
  import { EXERCISE_BY_ID, MUSCLE_LABELS, PATTERNS, PATTERN_BY_ID, TECHNIQUE_LABELS } from '../lib/exercises';
  import { todayReadiness } from '../lib/checkinStore';
  import type { Readiness } from '../lib/readiness';
  import { app } from '../lib/state.svelte';
  import { estimateMinutes, FEEDBACK_LABELS, muscleVolume, stepLabel, weeklyTarget } from '../lib/strength';
  import {
    ensureStates, feedbackExport, getRirOffset, planSession, recentChanges, recentSessions, startSession, undoChange
  } from '../lib/training';
  import type { ChangeLogEntry, Muscle, PatternState, PlannedExercise, Profile } from '../lib/types';

  let { profile }: { profile: Profile } = $props();

  // svelte-ignore state_referenced_locally
  let minutes = $state(profile.availability.typicalMinutes);
  let preview = $state<PlannedExercise[]>([]);
  let states = $state<PatternState[]>([]);
  let volume = $state<Partial<Record<Muscle, number>>>({});
  let changes = $state<ChangeLogEntry[]>([]);
  let rirOffset = $state(0);
  let starting = $state(false);
  let ready = $state<Readiness | null>(null);

  async function refresh() {
    ready = await todayReadiness(profile);
    states = await ensureStates(profile);
    rirOffset = await getRirOffset(profile.id);
    volume = muscleVolume(await recentSessions(profile.id, 7), rirOffset, new Date(Date.now() - 7 * 86400000));
    changes = await recentChanges(profile.id, 10);
    preview = await planSession(profile, minutes);
  }
  onMount(refresh);

  async function pick(m: number) {
    minutes = m;
    preview = await planSession(profile, minutes);
  }

  async function start() {
    if (ready?.caps.hardStop) return;
    if (ready?.caps.noTraining && !confirm('Laut Check-in bist du heute krank. Wirklich trainieren? Empfohlen ist Pause.')) return;
    starting = true;
    app.session = await startSession(profile, minutes);
    starting = false;
  }

  async function undo(c: ChangeLogEntry) {
    if (c.id === undefined) return;
    if (await undoChange(c.id)) await refresh();
    else alert('Diese Änderung wurde inzwischen überholt und lässt sich nicht mehr zurücknehmen.');
  }

  async function exportFeedback() {
    const fb = await feedbackExport(profile.id);
    const lines = fb.map((f) => `- ${new Date(f.at).toLocaleDateString('de-DE')}: ${EXERCISE_BY_ID[f.exerciseId]?.name ?? f.exerciseId}${f.bandLevel ? ` (Band ${f.bandLevel})` : ''} – ${FEEDBACK_LABELS[f.reason]}${f.note ? `: ${f.note}` : ''}`);
    const text = `Übungs-Rückmeldungen (${profile.name})\n\n${lines.join('\n') || 'Keine Rückmeldungen.'}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Übungs-Rückmeldungen', text }); return; } catch { /* abgebrochen */ }
    }
    await navigator.clipboard?.writeText(text);
    alert('In die Zwischenablage kopiert.');
  }

  let placedLower = $derived(states.filter((s) => PATTERN_BY_ID[s.pattern].half === 'lower' && s.placed).length);
  let placedUpper = $derived(states.filter((s) => PATTERN_BY_ID[s.pattern].half === 'upper' && s.placed).length);
  let totalLower = $derived(states.filter((s) => PATTERN_BY_ID[s.pattern].half === 'lower').length);
  let totalUpper = $derived(states.filter((s) => PATTERN_BY_ID[s.pattern].half === 'upper').length);
  const muscles: Muscle[] = ['chest', 'upperBack', 'lats', 'shoulders', 'biceps', 'triceps', 'quads', 'glutes', 'hamstrings', 'calves', 'core'];
  // svelte-ignore state_referenced_locally
  const minuteOptions = [...new Set([20, 30, 45, 60, profile.availability.typicalMinutes])].sort((a, b) => a - b);
</script>

<main>
  <h1>Kraft</h1>

  {#if !ready}
    <div class="card"><p class="small">Tipp: Mach zuerst den Morgen-Check auf „Heute“ – dann passt die Einheit zu deiner Tagesform.</p></div>
  {:else if ready.caps.hardStop || ready.caps.noTraining}
    <div class="card danger"><p class="small">{ready.reasons[0]}</p></div>
  {:else if ready.light !== 'green' || ready.caps.painRegions.length || ready.caps.noIntensity}
    <div class="card warn">
      <p class="small"><b>Heute angepasst:</b>
        {ready.light === 'red' ? 'kurze, leichte Einheit (max. 2 Sätze, 3 Wdh. Reserve).' : ready.caps.minRir >= 2 ? 'alle Sätze mit mindestens 2 Wdh. Reserve, kein Kalibrierungssatz.' : ''}
        {ready.caps.painRegions.length ? 'Übungen für schmerzende Regionen sind heute weggelassen.' : ''}
        Diese Einheit verändert deine Stufen nicht.</p>
    </div>
  {/if}

  <div class="card">
    <h3>Neue Einheit</h3>
    <p class="small muted">Wie viel Zeit hast du?</p>
    <div class="mins">
      {#each minuteOptions as m (m)}
        <button class:on={minutes === m} onclick={() => pick(m)}>{m} min</button>
      {/each}
    </div>
    {#if preview.length}
      <ul class="plan">
        {#each preview as x (x.pattern)}
          <li>
            <span>{stepLabel(x, profile)}</span>
            <span class="muted small">{x.sets}× {x.repWindow[0]}–{x.repWindow[1]}{x.calibrationLastSet ? ' · Kalibrierung' : ''}</span>
          </li>
        {/each}
      </ul>
      <p class="small muted">≈ {estimateMinutes(preview)} min inkl. Aufwärmen</p>
    {/if}
    <button class="primary block" onclick={start} disabled={starting || !preview.length || ready?.caps.hardStop}>{ready?.caps.noTraining && !ready.caps.hardStop ? 'Trotzdem starten' : 'Training starten'}</button>
  </div>

  <h2>Einstufung</h2>
  <p class="small muted">Findet für jedes Bewegungsmuster die Variante, bei der du in 8–20 Wdh. ans Limit kommst. Am besten Unter- und Oberkörper an verschiedenen Tagen, ausgeruht.</p>
  <div class="grid2">
    <button class="place" onclick={() => (app.placement = 'lower')}>
      <b>Unterkörper</b><span class="small muted">{placedLower}/{totalLower} eingestuft</span>
    </button>
    <button class="place" onclick={() => (app.placement = 'upper')}>
      <b>Oberkörper</b><span class="small muted">{placedUpper}/{totalUpper} eingestuft</span>
    </button>
  </div>

  <h2>Wochenvolumen</h2>
  <p class="small muted">Harte Sätze der letzten 7 Tage je Muskel (Synergisten zählen halb). Ziel nach deinem Schwerpunkt.</p>
  <div class="card">
    {#each muscles as m (m)}
      {@const v = volume[m] ?? 0}
      {@const t = weeklyTarget(profile, m)}
      <div class="vol">
        <span class="small">{MUSCLE_LABELS[m]}</span>
        <div class="bar"><div style="width: {Math.min(100, (v / t) * 100)}%" class:full={v >= t}></div></div>
        <span class="small num">{fmt(v)}/{t}</span>
      </div>
    {/each}
  </div>
  {#if rirOffset !== 0}
    <p class="small muted">RIR-Kalibrierung: Deine Reserve-Angaben werden um {rirOffset > 0 ? '+' : ''}{fmt(rirOffset)} korrigiert{rirOffset > 0 ? ' (du schaffst meist mehr, als du denkst)' : ''}.</p>
  {/if}

  <h2>Deine Stufen</h2>
  <ul class="list card">
    {#each PATTERNS as pat (pat.id)}
      {@const st = states.find((s) => s.pattern === pat.id)}
      <li>
        <b>{pat.name}</b>
        {#if st}
          <br /><span class="small">{stepLabel(st.step, profile)}</span>
          {#if st.technique}<br /><span class="small tech">{TECHNIQUE_LABELS[st.technique]}</span>{/if}
          {#if st.underloaded}<br /><span class="small tech">Schwerste Variante erreicht – Intensivierung aktiv</span>{/if}
        {:else}
          <br /><span class="small muted">Pausiert (Beschwerden oder fehlendes Equipment)</span>
        {/if}
      </li>
    {/each}
  </ul>

  {#if changes.length}
    <h2>Letzte Änderungen</h2>
    {#each changes as c (c.id)}
      <div class="card" class:undone={c.undone}>
        <p class="small"><b>{c.what}</b></p>
        <p class="small muted">{c.why} <span class="rule">{c.ruleId}</span> · {new Date(c.at).toLocaleDateString('de-DE')}</p>
        {#if c.undone}<p class="small">Zurückgenommen.</p>
        {:else if c.prev}<button class="ghost" onclick={() => undo(c)}>Rückgängig</button>{/if}
      </div>
    {/each}
  {/if}

  <h2>Rückmeldungen</h2>
  <p class="small muted">Alles, was du bei „Klappt nicht" eingegeben hast – zum Teilen, damit der Übungskatalog verbessert werden kann.</p>
  <button class="block" onclick={exportFeedback}>Rückmeldungen teilen</button>
</main>

<style>
  .mins { display: grid; grid-template-columns: repeat(auto-fit, minmax(56px, 1fr)); gap: 8px; margin-bottom: 12px; }
  .mins button { border: 1.5px solid var(--line); background: var(--surface); padding: 10px 4px; font-weight: 600; }
  .mins button.on { border-color: var(--accent); background: var(--accent-soft); }
  .plan { list-style: none; padding: 0; margin: 0 0 8px; }
  .plan li { display: flex; flex-direction: column; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .place { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; text-align: left; background: var(--surface); border: 1px solid var(--line); }
  .vol { display: grid; grid-template-columns: 130px 1fr 48px; gap: 8px; align-items: center; margin: 6px 0; }
  .bar { height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
  .bar div { height: 100%; background: var(--warn); border-radius: 4px; }
  .bar div.full { background: var(--accent); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .tech { color: var(--warn); }
  .undone { opacity: 0.6; }
  .rule { font-size: 12px; background: var(--surface-2); padding: 1px 6px; border-radius: 6px; }
</style>
