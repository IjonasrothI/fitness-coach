<script lang="ts">
  import Toggle from '../components/Toggle.svelte';
  import { REGION_LABELS } from '../lib/defaults';
  import { saveCheckIn } from '../lib/checkinStore';
  import { todayKey, WARNING_LABELS } from '../lib/readiness';
  import type { BodyRegion, CheckIn, PainEntry, Profile, WarningSymptom } from '../lib/types';

  let { profile, existing, onclose }: { profile: Profile; existing?: CheckIn; onclose: (saved: boolean) => void } = $props();

  const date = todayKey();
  // svelte-ignore state_referenced_locally
  const e = existing;
  let sleepH = $state(e?.sleepH ?? 7.5);
  let sleepQ = $state(e?.sleepQ ?? 3);
  let energy = $state(e?.energy ?? 3);
  let soreness = $state(e?.soreness ?? 2);
  let sorenessRegions = $state<BodyRegion[]>(e?.sorenessRegions ?? []);
  let stress = $state(e?.stress ?? 2);
  let motivation = $state(e?.motivation ?? 3);
  let pain = $state<PainEntry[]>(e?.pain ?? []);
  let sick = $state(e?.sick ?? false);
  let warning = $state<WarningSymptom[]>(e?.warning ?? []);
  let restingHr = $state<number | null>(e?.restingHr ?? null);
  let period = $state(e?.period ?? false);
  let cycleSymptoms = $state(e?.cycleSymptoms ?? 0);
  let showWarn = $state((e?.warning.length ?? 0) > 0);

  const SCALES: { key: 'sleepQ' | 'energy' | 'soreness' | 'stress' | 'motivation'; label: string; low: string; high: string }[] = [
    { key: 'sleepQ', label: 'Schlafqualität', low: 'sehr schlecht', high: 'sehr gut' },
    { key: 'energy', label: 'Energie', low: 'leer', high: 'voller Energie' },
    { key: 'soreness', label: 'Muskelkater', low: 'keiner', high: 'sehr stark' },
    { key: 'stress', label: 'Stress', low: 'entspannt', high: 'sehr gestresst' },
    { key: 'motivation', label: 'Lust auf Training', low: 'keine', high: 'sehr groß' }
  ];
  const vals = {
    get sleepQ() { return sleepQ; }, set sleepQ(v) { sleepQ = v; },
    get energy() { return energy; }, set energy(v) { energy = v; },
    get soreness() { return soreness; }, set soreness(v) { soreness = v; },
    get stress() { return stress; }, set stress(v) { stress = v; },
    get motivation() { return motivation; }, set motivation(v) { motivation = v; }
  };
  const regions = Object.keys(REGION_LABELS) as BodyRegion[];
  const sorenessOptions: BodyRegion[] = ['shoulder', 'upperBack', 'lowerBack', 'hip', 'knee', 'other'];

  function toggleSore(r: BodyRegion) {
    sorenessRegions = sorenessRegions.includes(r) ? sorenessRegions.filter((x) => x !== r) : [...sorenessRegions, r];
  }
  function toggleWarn(w: WarningSymptom) {
    warning = warning.includes(w) ? warning.filter((x) => x !== w) : [...warning, w];
  }

  async function save() {
    const c: CheckIn = {
      id: `${profile.id}:${date}`, profileId: profile.id, date, at: new Date().toISOString(),
      sleepH, sleepQ, energy, soreness, sorenessRegions: soreness >= 3 ? sorenessRegions : [], stress, motivation,
      pain: pain.filter((x) => x.score > 0), sick, warning,
      restingHr: restingHr && restingHr >= 30 && restingHr <= 120 ? restingHr : undefined,
      period: profile.cycleTrackingConsent ? period : undefined,
      cycleSymptoms: profile.cycleTrackingConsent ? cycleSymptoms : undefined,
      override: e?.override
    };
    await saveCheckIn(c);
    onclose(true);
  }
</script>

<main>
  <button class="ghost" onclick={() => onclose(false)}>Abbrechen</button>
  <h1>Morgen-Check</h1>
  <p class="muted small">30 Sekunden. Deine Antworten steuern das Training heute – sie zählen mehr als jede Uhr.</p>

  <div class="card">
    <span class="lbl">Schlaf: <b>{sleepH.toLocaleString('de-DE')} h</b></span>
    <input type="range" min="3" max="11" step="0.5" bind:value={sleepH} aria-label="Schlafdauer in Stunden" />
  </div>

  {#each SCALES as s (s.key)}
    <div class="card scale">
      <span class="lbl">{s.label}</span>
      <div class="dots" role="radiogroup" aria-label={s.label}>
        {#each [1, 2, 3, 4, 5] as v (v)}
          <button role="radio" aria-checked={vals[s.key] === v} class:on={vals[s.key] === v} onclick={() => (vals[s.key] = v)}>{v}</button>
        {/each}
      </div>
      <div class="ends small muted"><span>{s.low}</span><span>{s.high}</span></div>
      {#if s.key === 'soreness' && soreness >= 3}
        <div class="chips">
          {#each sorenessOptions as r (r)}
            <button class:on={sorenessRegions.includes(r)} onclick={() => toggleSore(r)}>{r === 'other' ? 'Beine/Sonstiges' : REGION_LABELS[r]}</button>
          {/each}
        </div>
      {/if}
    </div>
  {/each}

  <div class="card">
    <span class="lbl">Schmerzen (nicht Muskelkater)</span>
    {#each pain as x, i (i)}
      <div class="painrow">
        <select bind:value={x.region} aria-label="Region">
          {#each regions as r (r)}<option value={r}>{REGION_LABELS[r]}</option>{/each}
        </select>
        <span class="score" class:high={x.score > 5}>{x.score}/10</span>
        <button class="ghost" aria-label="Entfernen" onclick={() => pain.splice(i, 1)}>✕</button>
      </div>
      <input type="range" min="1" max="10" bind:value={x.score} aria-label="Schmerzstärke" />
    {/each}
    <button class="block" onclick={() => pain.push({ region: 'knee', score: 3 })}>+ Schmerz eintragen</button>
    <p class="small muted hint">0–2 unbedenklich · 3–5 akzeptabel · über 5 wird die Region geschont</p>
  </div>

  <div class="card">
    <Toggle label="Ich fühle mich krank" hint="Fieber, Gliederschmerzen, Infekt" bind:checked={sick} />
    <Toggle label="Warnzeichen?" hint="Brust, Atmung, Herz, Ohnmacht" bind:checked={showWarn} />
    {#if showWarn}
      <div class="warnlist">
        {#each Object.entries(WARNING_LABELS) as [k, v] (k)}
          <button class:on={warning.includes(k as WarningSymptom)} onclick={() => toggleWarn(k as WarningSymptom)}>{v}</button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="card">
    <label class="field"><span>Ruhepuls (optional, morgens im Liegen)</span>
      <input type="number" inputmode="numeric" placeholder="z. B. 52" bind:value={restingHr} />
    </label>
  </div>

  {#if profile.cycleTrackingConsent}
    <div class="card">
      <Toggle label="Periode heute" bind:checked={period} />
      <span class="lbl">Zyklusbeschwerden: {['keine', 'leicht', 'mittel', 'stark'][cycleSymptoms]}</span>
      <input type="range" min="0" max="3" bind:value={cycleSymptoms} aria-label="Zyklusbeschwerden" />
    </div>
  {/if}

  <button class="primary block save" onclick={save}>Speichern</button>
</main>

<style>
  .lbl { display: block; font-size: 15px; font-weight: 600; margin-bottom: 8px; }
  .scale { padding-bottom: 10px; }
  .dots { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
  .dots button { border: 1.5px solid var(--line); background: var(--surface); font-weight: 650; padding: 10px 0; }
  .dots button.on { border-color: var(--accent); background: var(--accent); color: var(--accent-ink); }
  .ends { display: flex; justify-content: space-between; margin-top: 4px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
  .chips button, .warnlist button { border: 1.5px solid var(--line); background: var(--surface); font-weight: 500; font-size: 14px; padding: 6px 10px; min-height: 36px; }
  .chips button.on { border-color: var(--accent); background: var(--accent-soft); }
  .warnlist { display: grid; gap: 6px; margin-top: 8px; }
  .warnlist button { text-align: left; }
  .warnlist button.on { border-color: var(--danger); background: var(--danger-soft); color: var(--danger); }
  .painrow { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
  .painrow select { flex: 1; }
  .score { font-weight: 700; min-width: 48px; text-align: right; }
  .score.high { color: var(--danger); }
  .hint { margin-top: 8px; }
  .save { min-height: 56px; margin-top: 16px; }
</style>
