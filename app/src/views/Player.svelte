<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import FeedbackSheet from '../components/FeedbackSheet.svelte';
  import RestTimer from '../components/RestTimer.svelte';
  import Stepper from '../components/Stepper.svelte';
  import { REGION_LABELS } from '../lib/defaults';
  import { EXERCISE_BY_ID, TECHNIQUE_LABELS } from '../lib/exercises';
  import { app } from '../lib/state.svelte';
  import { keepAwake, unlockAudio } from '../lib/sound';
  import { stepLabel, windowFor } from '../lib/strength';
  import { discardSession, finishSession, giveFeedback, saveSession, undoChange } from '../lib/training';
  import type { BodyRegion, ChangeLogEntry, FeedbackReason, Profile, StrengthSession } from '../lib/types';

  let { profile, initial }: { profile: Profile; initial: StrengthSession } = $props();

  // svelte-ignore state_referenced_locally
  let s = $state<StrengthSession>(JSON.parse(JSON.stringify(initial)));
  let phase = $state<'set' | 'rest' | 'finish' | 'summary'>('set');
  // svelte-ignore state_referenced_locally
  let exIdx = $state(firstOpenExercise(initial));
  let reps = $state(10);
  let rir = $state(2);
  let cal = $state({ stopReps: 10, estRir: 2, totalReps: 12 });
  let showFeedback = $state(false);
  let showCues = $state(true);
  let toast = $state<string | null>(null);
  let toastAction = $state<{ label: string; run: () => void } | null>(null);
  let changes = $state<ChangeLogEntry[]>([]);
  let skipped = $state<Set<number>>(new Set());
  // Abschluss-Feedback
  let sRpe = $state(6);
  let enjoyment = $state(4);
  let painOn = $state(false);
  let painRegion = $state<BodyRegion>('knee');
  let painScore = $state(3);

  function firstOpenExercise(x: StrengthSession): number {
    const i = x.plan.findIndex((pe, idx) => setsDoneFor(x, idx) < pe.sets);
    return i < 0 ? 0 : i;
  }
  function setsDoneFor(x: StrengthSession, idx: number): number {
    const pe = x.plan[idx]!;
    return x.sets.filter((st) => st.pattern === pe.pattern).length;
  }

  let cur = $derived(s.plan[exIdx]!);
  let ex = $derived(EXERCISE_BY_ID[cur.exerciseId]!);
  let done = $derived(setsDoneFor(s, exIdx));
  let isLastSet = $derived(done === cur.sets - 1);
  let isCal = $derived(isLastSet && cur.calibrationLastSet);
  let win = $derived(cur.repWindow);
  let rirTarget = $derived(cur.minRir ? `${cur.minRir}–${cur.minRir + 1}` : isLastSet && ex.safeToFailure ? '0–1' : '1–2');
  let totalSets = $derived(s.plan.reduce((t, x) => t + x.sets, 0));

  onMount(() => {
    window.scrollTo(0, 0);
    keepAwake(true);
  });
  onDestroy(() => keepAwake(false));

  // Vorschlag für Wiederholungen: letzter Satz dieser Übung, sonst Fenstermitte
  $effect(() => {
    const prev = [...s.sets].reverse().find((x) => x.pattern === cur.pattern);
    const suggestion = prev?.reps ?? Math.round((win[0] + win[1]) / 2);
    // nur Vorschlag setzen – `reps` hier nicht lesen, sonst wird jede Eingabe zurückgesetzt
    reps = suggestion;
    cal = { stopReps: suggestion, estRir: 2, totalReps: suggestion + 2 };
  });

  async function persist() {
    await saveSession(s);
    app.session = s;
  }

  function nextOpen(from: number): number {
    for (let i = from; i < s.plan.length; i++) {
      if (!skipped.has(i) && setsDoneFor(s, i) < s.plan[i]!.sets) return i;
    }
    for (let i = 0; i < from; i++) {
      if (!skipped.has(i) && setsDoneFor(s, i) < s.plan[i]!.sets) return i;
    }
    return -1;
  }

  async function logSet() {
    unlockAudio();
    const base = { pattern: cur.pattern, exerciseId: cur.exerciseId, bandLevel: cur.bandLevel, at: new Date().toISOString() };
    if (isCal) {
      const total = Math.max(cal.totalReps, cal.stopReps);
      s.sets.push({ ...base, reps: cal.stopReps, rir: cal.estRir, calibration: { ...cal, totalReps: total } });
    } else {
      s.sets.push({ ...base, reps, rir });
    }
    await persist();
    const loggedReps = isCal ? cal.stopReps : reps;
    if (loggedReps > 30 && setsDoneFor(s, exIdx) < cur.sets) {
      toast = `${loggedReps} Wdh. – zu leicht für Muskelaufbau (über 30). Restliche Sätze schwerer machen?`;
      toastAction = { label: 'Schwerer', run: () => onFeedback('tooEasy', 'automatisch: > 30 Wdh.') };
    }
    const n = nextOpen(exIdx);
    if (n < 0) {
      phase = 'finish';
    } else {
      exIdx = n;
      phase = 'rest';
    }
    window.scrollTo(0, 0);
  }

  function skipExercise() {
    skipped = new Set([...skipped, exIdx]);
    const n = nextOpen(exIdx + 1);
    if (n < 0) phase = 'finish';
    else exIdx = n;
  }

  async function onFeedback(reason: FeedbackReason, note: string) {
    showFeedback = false;
    const r = await giveFeedback(profile, cur.pattern, reason, note);
    if (!r) {
      if (reason === 'tooHard') {
        toast = 'Das ist schon die leichteste Variante. Mach weniger Wiederholungen und lass 2–3 in Reserve.';
        return;
      }
      toast = 'Keine Alternative mit deinem Equipment verfügbar – Übung wird übersprungen.';
      skipExercise();
      return;
    }
    const pe = s.plan[exIdx]!;
    pe.exerciseId = r.state.step.exerciseId;
    pe.bandLevel = r.state.step.bandLevel;
    pe.repWindow = windowFor(r.state.step);
    pe.technique = r.state.technique;
    // bereits geloggte Sätze dieses Musters zählen weiter mit, neue Übung bekommt die restlichen Sätze
    await persist();
    toast = r.entry.what;
    toastAction = null;
    changes = [...changes, r.entry];
    if (reason === 'pain') skipExercise();
  }

  async function finish() {
    const pain = painOn ? [{ region: painRegion, score: painScore }] : [];
    const c = await finishSession(profile, s, { sRpe, enjoyment, pain });
    changes = [...changes, ...c];
    toast = null;
    toastAction = null;
    phase = 'summary';
    window.scrollTo(0, 0);
  }

  async function abort() {
    if (s.sets.length === 0) {
      if (!confirm('Einheit verwerfen?')) return;
      await discardSession(s.id);
      app.session = null;
      return;
    }
    phase = 'finish';
  }

  async function undo(c: ChangeLogEntry) {
    if (c.id === undefined) return;
    const ok = await undoChange(c.id);
    if (ok) changes = changes.map((x) => (x.id === c.id ? { ...x, undone: true } : x));
    else toast = 'Diese Änderung wurde inzwischen überholt und lässt sich nicht mehr zurücknehmen.';
  }

  function close() {
    app.session = null;
    app.view = 'strength';
  }

  const RPE_LABELS: Record<number, string> = {
    0: 'Ruhe', 1: 'Sehr leicht', 2: 'Leicht', 3: 'Moderat', 4: 'Etwas schwer', 5: 'Schwer',
    6: 'Schwer+', 7: 'Sehr schwer', 8: 'Sehr schwer+', 9: 'Fast maximal', 10: 'Maximal'
  };
  const JOY = ['', 'Gar nicht', 'Wenig', 'Okay', 'Gut', 'Sehr gut'];
</script>

<main class="player">
  {#if phase === 'set' || phase === 'rest'}
    <div class="top">
      <button class="ghost" onclick={abort}>Beenden</button>
      <span class="small muted">{s.sets.length} / {totalSets} Sätze</span>
    </div>
    <div class="progress"><div style="width: {(s.sets.length / totalSets) * 100}%"></div></div>
  {/if}

  {#if toast}
    <div class="card accent toast" role="status">
      <p class="small">{toast}</p>
      {#if toastAction}
        <button class="primary" onclick={() => { const a = toastAction; toast = null; toastAction = null; a?.run(); }}>{toastAction.label}</button>
      {/if}
      <button class="ghost" onclick={() => { toast = null; toastAction = null; }}>{toastAction ? 'Nein' : 'OK'}</button>
    </div>
  {/if}

  {#if phase === 'rest'}
    <RestTimer seconds={cur.restSec} next={`${stepLabel(cur, profile)} – Satz ${done + 1}`} ondone={() => (phase = 'set')} />
  {:else if phase === 'set'}
    <p class="small muted">Übung {exIdx + 1} von {s.plan.length} · Satz {done + 1} von {cur.sets}</p>
    <h1>{ex.name}</h1>
    {#if cur.bandLevel !== undefined}
      <p class="band">Band {cur.bandLevel} · {profile.equipment.bands.find((b) => b.level === cur.bandLevel)?.label}</p>
    {/if}

    <div class="card target">
      <div><span class="stat">{win[0]}–{win[1]}</span> <span class="muted">Wdh.{ex.unilateral ? ' pro Seite' : ''}</span></div>
      <div class="small">Ziel: noch <b>{rirTarget}</b> Wdh. im Tank (Reserve)</div>
      {#if cur.technique}<div class="small tech">{TECHNIQUE_LABELS[cur.technique]}</div>{/if}
      {#if cur.minRir}<div class="small tech">Tagesform: heute bewusst mehr Reserve lassen</div>{/if}
    </div>

    <details bind:open={showCues}>
      <summary class="small">Ausführung</summary>
      <ul class="small">{#each ex.cues as c (c)}<li>{c}</li>{/each}</ul>
    </details>

    {#if isCal}
      <div class="card warn">
        <h3>Kalibrierungs-Satz</h3>
        <p class="small">Trainiere wie gewohnt und <b>merke dir</b>, wo du normalerweise aufhören würdest und wie viele Wdh. du noch im Tank schätzt. Dann <b>weiter bis zum Muskelversagen</b> (saubere Technik). So lernt die App, wie gut du deine Reserve einschätzt.</p>
      </div>
      <span class="lbl">Wdh. bis zum normalen Stopp</span>
      <Stepper bind:value={cal.stopReps} label="Wiederholungen bis Stopp" max={80} />
      <span class="lbl">Geschätzte Reserve an dem Punkt</span>
      <div class="rir">
        {#each [0, 1, 2, 3, 4, 5] as v (v)}
          <button class:on={cal.estRir === v} onclick={() => (cal.estRir = v)}>{v === 5 ? '5+' : v}</button>
        {/each}
      </div>
      <span class="lbl">Wdh. insgesamt bis zum Versagen</span>
      <Stepper bind:value={cal.totalReps} label="Wiederholungen gesamt" max={100} />
    {:else}
      <span class="lbl">Geschaffte Wiederholungen{ex.unilateral ? ' (schwächere Seite)' : ''}</span>
      <Stepper bind:value={reps} label="Wiederholungen" max={100} />
      <span class="lbl">Wie viele hättest du noch geschafft?</span>
      <div class="rir">
        {#each [0, 1, 2, 3, 4] as v (v)}
          <button class:on={rir === v} onclick={() => (rir = v)}>{v === 4 ? '4+' : v}</button>
        {/each}
      </div>
      <p class="small muted hint">0 = ging nichts mehr · 4+ = noch viel Luft</p>
    {/if}

    <button class="primary block save" onclick={logSet}>Satz speichern</button>
    <div class="row secondary">
      <button onclick={() => (showFeedback = true)}>Klappt nicht</button>
      <button onclick={skipExercise}>Überspringen</button>
    </div>

  {:else if phase === 'finish'}
    <h1>Geschafft</h1>
    <p class="muted">{s.sets.length} Sätze. Noch drei kurze Fragen – sie steuern deine nächsten Einheiten.</p>

    <h2>Wie anstrengend war die Einheit insgesamt?</h2>
    <div class="rpe">
      <span class="stat">{sRpe}</span> <span>{RPE_LABELS[sRpe]}</span>
    </div>
    <input type="range" min="0" max="10" bind:value={sRpe} aria-label="Anstrengung 0 bis 10" />

    <h2>Wie viel Spaß hat es gemacht?</h2>
    <div class="joy">
      {#each [1, 2, 3, 4, 5] as v (v)}
        <button class:on={enjoyment === v} onclick={() => (enjoyment = v)}>{JOY[v]}</button>
      {/each}
    </div>

    <h2>Schmerzen?</h2>
    <div class="joy two">
      <button class:on={!painOn} onclick={() => (painOn = false)}>Nein</button>
      <button class:on={painOn} onclick={() => (painOn = true)}>Ja</button>
    </div>
    {#if painOn}
      <label class="field"><span>Wo?</span>
        <select bind:value={painRegion}>
          {#each Object.entries(REGION_LABELS) as [k, v] (k)}<option value={k}>{v}</option>{/each}
        </select>
      </label>
      <span class="lbl">Stärke: {painScore}/10</span>
      <input type="range" min="1" max="10" bind:value={painScore} aria-label="Schmerzstärke" />
      {#if painScore > 5}
        <p class="small warn-text">Über 5/10: Diese Region wird geschont. Wird es schlimmer oder hält es über 2 Wochen an, bitte abklären lassen.</p>
      {/if}
    {/if}

    <button class="primary block save" onclick={finish}>Einheit speichern</button>

  {:else}
    <h1>Gespeichert</h1>
    {#if changes.length}
      <h2>Das ändert sich</h2>
      {#each changes as c (c.id)}
        <div class="card" class:undone={c.undone}>
          <p><b>{c.what}</b></p>
          <p class="small muted">{c.why} <span class="rule">{c.ruleId}</span></p>
          {#if c.undone}
            <p class="small">Zurückgenommen.</p>
          {:else if c.prev}
            <button class="ghost" onclick={() => undo(c)}>Rückgängig</button>
          {/if}
        </div>
      {/each}
    {:else}
      <div class="card"><p class="small">Keine Stufenwechsel – du bleibst auf deinen Varianten und steigerst die Wiederholungen.</p></div>
    {/if}
    <button class="primary block save" onclick={close}>Fertig</button>
  {/if}
</main>

{#if showFeedback}
  <FeedbackSheet exerciseName={stepLabel(cur, profile)} onsubmit={onFeedback} oncancel={() => (showFeedback = false)} />
{/if}

<style>
  .player { padding-bottom: 40px; }
  .top { display: flex; justify-content: space-between; align-items: center; }
  .progress { height: 4px; background: var(--surface-2); border-radius: 2px; overflow: hidden; margin: 4px 0 12px; }
  .progress div { height: 100%; background: var(--accent); transition: width 0.3s; }
  .band { font-weight: 600; color: var(--accent); margin: 0; }
  .target { display: flex; flex-direction: column; gap: 4px; }
  .tech { color: var(--warn); font-weight: 600; }
  details { margin: 8px 0 12px; }
  summary { cursor: pointer; color: var(--accent); font-weight: 600; }
  details ul { padding-left: 20px; margin: 8px 0; }
  .lbl { display: block; font-size: 14px; color: var(--muted); font-weight: 600; margin: 16px 0 6px; }
  .rir, .joy { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .rir:has(button:nth-child(6)) { grid-template-columns: repeat(6, 1fr); }
  .joy.two { grid-template-columns: 1fr 1fr; }
  .rir button, .joy button { border: 1.5px solid var(--line); background: var(--surface); font-weight: 600; padding: 10px 4px; }
  .joy button { font-size: 14px; }
  .rir button.on, .joy button.on { border-color: var(--accent); background: var(--accent-soft); }
  .hint { margin-top: 6px; }
  .save { margin-top: 24px; min-height: 56px; font-size: 18px; }
  .secondary { margin-top: 10px; }
  .rpe { display: flex; align-items: baseline; gap: 10px; }
  .toast { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .toast p { margin: 0; }
  .undone { opacity: 0.6; }
  .rule { font-size: 12px; background: var(--surface-2); padding: 1px 6px; border-radius: 6px; margin-left: 4px; }
  .warn-text { color: var(--warn); }
</style>
