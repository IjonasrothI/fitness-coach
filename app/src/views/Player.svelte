<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import CircuitRunner from '../components/CircuitRunner.svelte';
  import ExerciseAnim from '../components/ExerciseAnim.svelte';
  import ExerciseCard from '../components/ExerciseCard.svelte';
  import FaceScale from '../components/FaceScale.svelte';
  import FeedbackSheet from '../components/FeedbackSheet.svelte';
  import RestTimer from '../components/RestTimer.svelte';
  import Stepper from '../components/Stepper.svelte';
  import WorkTimer from '../components/WorkTimer.svelte';
  import { REGION_LABELS } from '../lib/defaults';
  import { EXERCISE_BY_ID, TECHNIQUE_LABELS } from '../lib/exercises';
  import { FORMAT_LABELS, MOOD_LABELS, prText, type PR } from '../lib/formats';
  import { db } from '../lib/db';
  import { app } from '../lib/state.svelte';
  import { keepAwake, setVoice, unlockAudio, voiceOn } from '../lib/sound';
  import { stepLabel, windowFor } from '../lib/strength';
  import {
    discardSession, extendSession, finishSession, getRatings, giveFeedback, rateExercise, saveSession, sessionRecords, undoChange
  } from '../lib/training';
  import type { BodyRegion, ChangeLogEntry, FeedbackReason, PlannedExercise, Profile, SetLog, StrengthSession } from '../lib/types';

  let { profile, initial }: { profile: Profile; initial: StrengthSession } = $props();

  // svelte-ignore state_referenced_locally
  let s = $state<StrengthSession>(JSON.parse(JSON.stringify(initial)));
  let phase = $state<'work' | 'rest' | 'extend' | 'finish' | 'summary'>('work');
  // svelte-ignore state_referenced_locally
  let exIdx = $state(firstOpenExercise(initial));
  let timed = $state<'ready' | 'running' | 'log'>('ready');
  let reps = $state(10);
  let rir = $state(2);
  let cal = $state({ stopReps: 10, estRir: 2, totalReps: 12 });
  let showFeedback = $state(false);
  let toast = $state<string | null>(null);
  let toastAction = $state<{ label: string; run: () => void } | null>(null);
  let changes = $state<ChangeLogEntry[]>([]);
  let skipped = $state<Set<number>>(new Set());
  let history = $state<StrengthSession[]>([]);
  let records = $state<PR[]>([]);
  let ratings = $state<Record<string, 1 | -1>>({});
  let voice = $state(voiceOn());
  let extending = $state(false);
  // Abschluss-Feedback
  let sRpe = $state(6);
  let enjoyment = $state(4);
  let painOn = $state(false);
  let painRegion = $state<BodyRegion>('knee');
  let painScore = $state(3);

  const easy = $derived(s.mood === 'easy');
  const isCircuit = $derived(s.format === 'circuit' && !!s.circuit);

  function setsDoneFor(x: StrengthSession, idx: number): number {
    const pe = x.plan[idx]!;
    return x.sets.filter((st) => st.pattern === pe.pattern).length;
  }
  function firstOpenExercise(x: StrengthSession): number {
    const i = x.plan.findIndex((pe, idx) => setsDoneFor(x, idx) < pe.sets);
    return i < 0 ? 0 : i;
  }
  // offener Zirkel-Block (Verlängerung = Block 1)
  let openBlock = $derived.by(() => {
    if (!isCircuit) return -1;
    const blocks = [...new Set(s.plan.map((x) => x.block ?? 0))].sort();
    return blocks.find((b) => s.plan.some((x, i) => (x.block ?? 0) === b && setsDoneFor(s, i) < x.sets && !skipped.has(i))) ?? -1;
  });

  let cur = $derived(s.plan[exIdx]!);
  let ex = $derived(EXERCISE_BY_ID[cur.exerciseId]!);
  let done = $derived(setsDoneFor(s, exIdx));
  let isLastSet = $derived(done === cur.sets - 1);
  let isCal = $derived(isLastSet && cur.calibrationLastSet && !cur.workSec);
  let win = $derived(cur.repWindow);
  let rirTarget = $derived(cur.minRir ? `${cur.minRir}–${cur.minRir + 1}` : isLastSet && ex.safeToFailure ? '0–1' : '1–2');
  let totalSets = $derived(s.plan.reduce((t, x) => t + x.sets, 0));
  let sides = $derived<1 | 2>(cur.workSec && ex.unilateral ? 2 : 1);

  onMount(async () => {
    window.scrollTo(0, 0);
    keepAwake(true);
    history = await db.sessions.where('profileId').equals(profile.id).filter((x) => x.status === 'done' && x.id !== s.id).toArray();
    ratings = await getRatings(profile.id);
    if (isCircuit && openBlock < 0 && s.sets.length) phase = 'finish';
  });
  onDestroy(() => keepAwake(false));

  /** Vorschlag: letzter Satz dieser Übung (gleiche Form), sonst aus der Vergangenheit, sonst Fenstermitte. */
  function suggest(pe: PlannedExercise): number {
    const same = (x: SetLog) => x.exerciseId === pe.exerciseId && (x.workSec ?? 0) === (pe.workSec ?? 0) && !x.estimated;
    const here = [...s.sets].reverse().find(same);
    if (here) return here.reps;
    const past = history.flatMap((h) => h.sets).filter(same).sort((a, b) => b.at.localeCompare(a.at))[0];
    if (past) return past.reps;
    const [lo, hi] = pe.repWindow;
    return pe.workSec ? Math.round((lo + hi) / 2) : Math.round((lo + hi) / 2);
  }
  function best(pe: PlannedExercise): number | null {
    const v = history.flatMap((h) => h.sets)
      .filter((x) => x.exerciseId === pe.exerciseId && (x.bandLevel ?? 0) === (pe.bandLevel ?? 0) && (x.workSec ?? 0) === (pe.workSec ?? 0) && !x.estimated)
      .map((x) => x.reps);
    return v.length ? Math.max(...v) : null;
  }

  $effect(() => {
    const sug = suggest(cur);
    reps = sug;
    rir = cur.minRir ?? 2;
    cal = { stopReps: sug, estRir: 2, totalReps: sug + 2 };
  });

  async function persist() {
    await saveSession(s);
    app.session = s;
  }

  function nextOpen(from: number): number {
    for (let i = from; i < s.plan.length; i++) if (!skipped.has(i) && setsDoneFor(s, i) < s.plan[i]!.sets) return i;
    for (let i = 0; i < from; i++) if (!skipped.has(i) && setsDoneFor(s, i) < s.plan[i]!.sets) return i;
    return -1;
  }

  function cheer(pe: PlannedExercise, value: number) {
    const b = best(pe);
    if (b !== null && value > b) { toast = `Neuer Rekord: ${value}${pe.workSec ? ` in ${pe.workSec} s` : ' Wdh.'} – vorher ${b}.`; toastAction = null; }
  }

  async function logSet(estimated = false) {
    unlockAudio();
    const base = { pattern: cur.pattern, exerciseId: cur.exerciseId, bandLevel: cur.bandLevel, at: new Date().toISOString(), workSec: cur.workSec };
    if (isCal && !estimated) {
      const total = Math.max(cal.totalReps, cal.stopReps);
      s.sets.push({ ...base, reps: cal.stopReps, rir: cal.estRir, calibration: { ...cal, totalReps: total } });
    } else {
      s.sets.push({ ...base, reps, rir: estimated ? Math.max(3, cur.minRir ?? 3) : rir, estimated: estimated || undefined });
    }
    await persist();
    const loggedReps = isCal ? cal.stopReps : reps;
    if (!estimated) cheer(cur, loggedReps);
    if (!estimated && loggedReps > 30 && setsDoneFor(s, exIdx) < cur.sets) {
      toast = `${loggedReps} Wdh. – zu leicht für Muskelaufbau (über 30). Restliche Sätze schwerer machen?`;
      toastAction = { label: 'Schwerer', run: () => onFeedback('tooEasy', 'automatisch: > 30 Wdh.') };
    }
    timed = 'ready';
    const n = nextOpen(exIdx);
    if (n < 0) phase = s.quick ? 'extend' : 'finish';
    else { exIdx = n; phase = 'rest'; }
    window.scrollTo(0, 0);
  }

  async function logCircuit(pe: PlannedExercise, r: number) {
    s.sets.push({
      pattern: pe.pattern, exerciseId: pe.exerciseId, bandLevel: pe.bandLevel, reps: r, workSec: pe.workSec,
      rir: easy ? Math.max(3, pe.minRir ?? 3) : 2, estimated: easy || undefined, at: new Date().toISOString()
    });
    await persist();
    if (!easy) cheer(pe, r);
  }

  function circuitDone() {
    phase = s.quick ? 'extend' : 'finish';
    window.scrollTo(0, 0);
  }

  async function extend() {
    extending = true;
    const next = await extendSession(profile, s, 10);
    extending = false;
    if (!next) { toast = 'Keine weiteren passenden Übungen für heute – starke Leistung!'; phase = 'finish'; return; }
    s = next;
    app.session = next;
    phase = 'work';
    window.scrollTo(0, 0);
  }

  function skipExercise() {
    skipped = new Set([...skipped, exIdx]);
    timed = 'ready';
    const n = nextOpen(exIdx + 1);
    if (n < 0) phase = s.quick ? 'extend' : 'finish';
    else exIdx = n;
  }

  async function onFeedback(reason: FeedbackReason, note: string) {
    showFeedback = false;
    const r = await giveFeedback(profile, cur.pattern, reason, note);
    if (!r) {
      if (reason === 'tooHard') { toast = 'Das ist schon die leichteste Variante. Mach weniger Wiederholungen und lass 2–3 in Reserve.'; return; }
      toast = 'Keine Alternative mit deinem Equipment verfügbar – Übung wird übersprungen.';
      skipExercise();
      return;
    }
    const pe = s.plan[exIdx]!;
    pe.exerciseId = r.state.step.exerciseId;
    pe.bandLevel = r.state.step.bandLevel;
    pe.repWindow = windowFor(r.state.step);
    pe.technique = r.state.technique;
    await persist();
    toast = r.entry.what;
    toastAction = null;
    changes = [...changes, r.entry];
    if (reason === 'pain') skipExercise();
  }

  async function finish() {
    const pain = painOn ? [{ region: painRegion, score: painScore }] : [];
    records = await sessionRecords(s);
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

  async function rate(pe: PlannedExercise, v: 1 | -1) {
    const nextV = ratings[pe.exerciseId] === v ? 0 : v;
    const entry = await rateExercise(profile, pe.pattern, pe.exerciseId, nextV);
    ratings = nextV === 0 ? Object.fromEntries(Object.entries(ratings).filter(([k]) => k !== pe.exerciseId)) : { ...ratings, [pe.exerciseId]: nextV };
    if (entry) changes = [...changes, entry];
  }

  function close() {
    app.session = null;
    app.view = 'strength';
  }
  function toggleVoice() { voice = !voice; setVoice(voice); }

  // geübte Übungen (für Daumen), je Übung einmal
  let practiced = $derived([...new Map(s.plan.filter((x) => s.sets.some((y) => y.exerciseId === x.exerciseId)).map((x) => [x.exerciseId, x])).values()]);
  let minutesDone = $derived(Math.max(1, Math.round((Date.now() - new Date(s.startedAt).getTime()) / 60000)));

  const RPE_LABELS: Record<number, string> = {
    0: 'Ruhe', 1: 'Sehr leicht', 2: 'Leicht', 3: 'Moderat', 4: 'Etwas schwer', 5: 'Schwer',
    6: 'Schwer+', 7: 'Sehr schwer', 8: 'Sehr schwer+', 9: 'Fast maximal', 10: 'Maximal'
  };
  const JOY = ['', '😖', '🙁', '😐', '🙂', '😄'];
  const JOY_L = ['', 'Gar nicht', 'Wenig', 'Okay', 'Gut', 'Sehr gut'];
</script>

<main class="player">
  {#if phase === 'work' || phase === 'rest'}
    <div class="top">
      <button class="ghost" onclick={abort}>Beenden</button>
      <span class="small muted">{FORMAT_LABELS[s.format ?? 'classic']}{s.mood && s.mood !== 'push' ? ` · ${MOOD_LABELS[s.mood]}` : ''} · {s.sets.length}/{totalSets}</span>
      <button class="ghost" onclick={toggleVoice} aria-pressed={voice} aria-label="Sprachansagen {voice ? 'aus' : 'an'}schalten">{voice ? '🔊' : '🔇'}</button>
    </div>
    <div class="progress"><div style="width: {(s.sets.length / Math.max(1, totalSets)) * 100}%"></div></div>
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

  {#if phase === 'work' && isCircuit && openBlock >= 0}
    {#key openBlock}
      <CircuitRunner {profile} session={s} block={openBlock} {easy} {suggest} onlog={logCircuit} ondone={circuitDone} />
    {/key}
  {:else if phase === 'rest'}
    <RestTimer seconds={cur.restSec} next={`${stepLabel(cur, profile)} – Satz ${done + 1}`} ondone={() => (phase = 'work')} />
    <ExerciseAnim id={cur.exerciseId} label={ex.name} />
  {:else if phase === 'work'}
    <p class="small muted meta">Übung {exIdx + 1} von {s.plan.length} · Satz {done + 1} von {cur.sets}</p>
    <h1 class="name">{ex.name}</h1>
    {#if cur.bandLevel !== undefined}
      <p class="band">Band {cur.bandLevel} · {profile.equipment.bands.find((b) => b.level === cur.bandLevel)?.label}</p>
    {/if}

    {#if !cur.workSec || timed === 'ready'}
      <ExerciseCard id={cur.exerciseId} />
    {/if}

    {#if cur.workSec}
      <!-- Zeit-Satz -->
      {#if timed === 'ready'}
        <div class="card target">
          <div><span class="stat">{cur.workSec} s</span> <span class="muted">{sides === 2 ? 'pro Seite' : ''}</span></div>
          <div class="small">{easy ? 'Ruhiges Tempo, Luft nach oben lassen.' : 'So viele saubere Wiederholungen wie möglich.'}</div>
          {#if !easy && best(cur) !== null}<div class="small">Dein Rekord: <b>{best(cur)}</b> – schaffst du einen mehr?</div>{/if}
        </div>
        <button class="primary block save" onclick={() => { unlockAudio(); timed = 'running'; }}>Start</button>
      {:else if timed === 'running'}
        <WorkTimer seconds={cur.workSec} {sides} note={easy ? 'Ruhiges Tempo' : ''} ondone={() => (easy ? logSet(true) : (timed = 'log'))} />
        <ExerciseAnim id={cur.exerciseId} label={ex.name} />
      {:else}
        <span class="lbl">Wie viele hast du geschafft?{ex.unilateral ? ' (schwächere Seite)' : ''}</span>
        <Stepper bind:value={reps} label="Wiederholungen" max={100} />
        <span class="lbl">Wie viele wären noch gegangen?</span>
        <FaceScale bind:value={rir} />
        <button class="primary block save" onclick={() => logSet()}>Speichern</button>
      {/if}
    {:else}
      <!-- Klassisch -->
      <div class="card target">
        <div><span class="stat">{win[0]}–{win[1]}</span> <span class="muted">Wdh.{ex.unilateral ? ' pro Seite' : ''}</span></div>
        <div class="small">{easy ? 'Locker: noch 3–4 Wdh. im Tank lassen' : `Ziel: noch ${rirTarget} Wdh. im Tank`}</div>
        {#if cur.technique}<div class="small tech">{TECHNIQUE_LABELS[cur.technique]}</div>{/if}
        {#if cur.minRir && !easy}<div class="small tech">Heute bewusst mehr Reserve lassen</div>{/if}
      </div>

      {#if easy}
        <button class="primary block save" onclick={() => logSet(true)}>Satz geschafft ✓</button>
      {:else if isCal}
        <div class="card warn">
          <h3>Kalibrierungs-Satz</h3>
          <p class="small">Trainiere wie gewohnt und <b>merke dir</b>, wo du normalerweise aufhören würdest und wie viele Wdh. du noch im Tank schätzt. Dann <b>weiter bis zum Muskelversagen</b> (saubere Technik). So lernt die App, wie gut du deine Reserve einschätzt.</p>
        </div>
        <span class="lbl">Wdh. bis zum normalen Stopp</span>
        <Stepper bind:value={cal.stopReps} label="Wiederholungen bis Stopp" max={80} />
        <span class="lbl">Geschätzte Reserve an dem Punkt</span>
        <FaceScale bind:value={cal.estRir} />
        <span class="lbl">Wdh. insgesamt bis zum Versagen</span>
        <Stepper bind:value={cal.totalReps} label="Wiederholungen gesamt" max={100} />
        <button class="primary block save" onclick={() => logSet()}>Satz speichern</button>
      {:else}
        <span class="lbl">Geschaffte Wiederholungen{ex.unilateral ? ' (schwächere Seite)' : ''}</span>
        <Stepper bind:value={reps} label="Wiederholungen" max={100} />
        <span class="lbl">Wie viele wären noch gegangen?</span>
        <FaceScale bind:value={rir} />
        <button class="primary block save" onclick={() => logSet()}>Satz speichern</button>
      {/if}
    {/if}
    {#if timed !== 'running'}
      <div class="row secondary">
        <button onclick={() => (showFeedback = true)}>Klappt nicht</button>
        <button onclick={skipExercise}>Überspringen</button>
      </div>
    {/if}

  {:else if phase === 'extend'}
    <h1>10 Minuten geschafft 🎉</h1>
    <p>Das war's schon – und es zählt. Wenn du noch Lust hast: 10 Minuten mit anderen Übungen dranhängen?</p>
    <button class="primary block save" onclick={extend} disabled={extending}>Ja, noch 10 Minuten</button>
    <button class="block" onclick={() => (phase = 'finish')}>Nein, fertig für heute</button>

  {:else if phase === 'finish'}
    <h1>Geschafft</h1>
    <p class="muted">{s.sets.length} Sätze in etwa {minutesDone} {minutesDone === 1 ? 'Minute' : 'Minuten'}. {easy ? 'Noch zwei kurze Fragen.' : 'Noch drei kurze Fragen – sie steuern deine nächsten Einheiten.'}</p>

    <h2>Wie viel Spaß hat es gemacht?</h2>
    <div class="joy">
      {#each [1, 2, 3, 4, 5] as v (v)}
        <button class:on={enjoyment === v} onclick={() => (enjoyment = v)} aria-label={JOY_L[v]}><span class="jf">{JOY[v]}</span><span class="jl">{JOY_L[v]}</span></button>
      {/each}
    </div>

    <h2>Wie anstrengend war es insgesamt?</h2>
    <div class="rpe"><span class="stat">{sRpe}</span> <span>{RPE_LABELS[sRpe]}</span></div>
    <input type="range" min="0" max="10" bind:value={sRpe} aria-label="Anstrengung 0 bis 10" />

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
    <h1>Gespeichert 💪</h1>
    <p class="muted">{s.sets.length} Sätze · {FORMAT_LABELS[s.format ?? 'classic']}{s.mood ? ` · ${MOOD_LABELS[s.mood]}` : ''}. Jede Einheit zählt – auch die kurzen.</p>

    {#if records.length}
      <h2>Neue Rekorde 🏆</h2>
      <div class="card accent">
        <ul class="recs">{#each records as r (r.exerciseId + (r.workSec ?? ''))}<li>{prText(r)}</li>{/each}</ul>
      </div>
    {/if}

    {#if practiced.length}
      <h2>Wie fandest du die Übungen?</h2>
      <p class="small muted">Daumen runter: Die Übung wird – wenn möglich – durch eine ähnlich schwere Alternative ersetzt.</p>
      <ul class="rate">
        {#each practiced as pe (pe.exerciseId)}
          <li>
            <span>{EXERCISE_BY_ID[pe.exerciseId]?.name}</span>
            <span class="thumbs">
              <button class:on={ratings[pe.exerciseId] === 1} onclick={() => rate(pe, 1)} aria-label="Mag ich" aria-pressed={ratings[pe.exerciseId] === 1}>👍</button>
              <button class:on={ratings[pe.exerciseId] === -1} onclick={() => rate(pe, -1)} aria-label="Mag ich nicht" aria-pressed={ratings[pe.exerciseId] === -1}>👎</button>
            </span>
          </li>
        {/each}
      </ul>
    {/if}

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
    {:else if !easy}
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
  .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
  .progress { height: 4px; background: var(--surface-2); border-radius: 2px; overflow: hidden; margin: 4px 0 10px; }
  .progress div { height: 100%; background: var(--accent); transition: width 0.3s; }
  .meta { margin: 0; }
  .name { font-size: 26px; }
  .band { font-weight: 600; color: var(--accent); margin: 0 0 8px; }
  .target { display: flex; flex-direction: column; gap: 4px; }
  .tech { color: var(--warn); font-weight: 600; }
  .lbl { display: block; font-size: 14px; color: var(--muted); font-weight: 600; margin: 16px 0 6px; }
  .joy { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
  .joy.two { grid-template-columns: 1fr 1fr; }
  .joy button { display: flex; flex-direction: column; align-items: center; gap: 2px; border: 1.5px solid var(--line); background: var(--surface); font-weight: 600; padding: 8px 2px; }
  .jf { font-size: 26px; line-height: 1; }
  .jl { font-size: 11px; color: var(--muted); white-space: nowrap; }
  .joy button.on { border-color: var(--accent); background: var(--accent-soft); }
  .save { margin-top: 20px; min-height: 56px; font-size: 18px; }
  .secondary { margin-top: 10px; }
  .rpe { display: flex; align-items: baseline; gap: 10px; }
  .toast { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .toast p { margin: 0; }
  .undone { opacity: 0.6; }
  .rule { font-size: 12px; background: var(--surface-2); padding: 1px 6px; border-radius: 6px; margin-left: 4px; }
  .warn-text { color: var(--warn); }
  .recs { margin: 0; padding-left: 20px; }
  .rate { list-style: none; padding: 0; margin: 0; }
  .rate li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--line); }
  .thumbs { display: flex; gap: 6px; }
  .thumbs button { font-size: 22px; min-width: 52px; min-height: 48px; padding: 4px; border: 1.5px solid var(--line); background: var(--surface); }
  .thumbs button.on { border-color: var(--accent); background: var(--accent-soft); }
</style>
