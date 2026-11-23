<script lang="ts">
  import Toggle from '../components/Toggle.svelte';
  import { REGION_LABELS } from '../lib/defaults';
  import { checkRunDistance, longestRun, parsePace, paceStr, SPORT_LABELS, TYPE_LABELS } from '../lib/endurance';
  import { saveEndurance, type Note } from '../lib/enduranceStore';
  import type { BodyRegion, EnduranceSession, EnduranceType, Profile, Sport } from '../lib/types';

  interface Props {
    profile: Profile;
    history: EnduranceSession[];
    prefill?: { sport: Sport; type: EnduranceType; minutes: number };
    sports: Sport[];
    onclose: (saved: boolean) => void;
  }
  let { profile, history, prefill, sports, onclose }: Props = $props();

  const today = new Date().toISOString().slice(0, 10);
  // svelte-ignore state_referenced_locally
  let sport = $state<Sport>(prefill?.sport ?? sports[0] ?? 'run');
  // svelte-ignore state_referenced_locally
  let type = $state<EnduranceType>(prefill?.type ?? 'easy');
  let date = $state(today);
  // svelte-ignore state_referenced_locally
  let duration = $state<number | null>(prefill?.minutes ?? null);
  let distance = $state<number | null>(null);
  let avgHr = $state<number | null>(null);
  let maxHrV = $state<number | null>(null);
  let avgPower = $state<number | null>(null);
  let intervalPace = $state('');
  let intervalPower = $state<number | null>(null);
  let hr2 = $state<number | null>(null);
  let elevation = $state<number | null>(null);
  let sRpe = $state(3);
  let painOn = $state(false);
  let painRegion = $state<BodyRegion>('knee');
  let painScore = $state(3);
  let note = $state('');
  let errors = $state<string[]>([]);
  let result = $state<Note[] | null>(null);
  let confirmLong = $state(false);

  const types: EnduranceType[] = ['easy', 'long', 'tempo', 'intervals', 'recovery'];
  let ref = $derived(longestRun(history, profile).km);
  let runCheck = $derived(sport === 'run' && distance ? checkRunDistance(distance, ref) : null);
  let pace = $derived(sport === 'run' && distance && duration ? (duration * 60) / distance : null);
  const RPE: Record<number, string> = { 0: 'Ruhe', 1: 'Sehr leicht', 2: 'Leicht', 3: 'Locker-moderat', 4: 'Etwas schwer', 5: 'Schwer', 6: 'Schwer+', 7: 'Sehr schwer', 8: 'Sehr schwer+', 9: 'Fast maximal', 10: 'Maximal' };

  const num = (v: number | null) => (v === null || v === undefined || Number.isNaN(v) || v === 0 ? undefined : Number(v));

  async function save() {
    errors = [];
    if (!duration || duration < 5 || duration > 600) errors.push('Dauer in Minuten eintragen (5–600).');
    if (sport === 'run' && (!distance || distance <= 0 || distance > 100)) errors.push('Distanz in km eintragen.');
    if (avgHr && (avgHr < 60 || avgHr > 220)) errors.push('Ø-Puls unplausibel.');
    if (maxHrV && (maxHrV < 100 || maxHrV > 230)) errors.push('Max-Puls unplausibel.');
    const ip = intervalPace ? parsePace(intervalPace) : null;
    if (intervalPace && ip === null) errors.push('Intervall-Pace als mm:ss eingeben, z. B. 4:20.');
    if (runCheck?.level === 'confirm' || runCheck?.level === 'block') {
      if (!confirmLong) errors.push('Bitte bestätige den sehr langen Lauf.');
    }
    if (errors.length) return;
    const isToday = date === today;
    const s: EnduranceSession = {
      id: crypto.randomUUID(), profileId: profile.id,
      date: isToday ? new Date().toISOString() : new Date(`${date}T12:00:00`).toISOString(),
      sport, type, durationMin: duration!, distanceKm: num(distance), avgHr: num(avgHr), maxHr: num(maxHrV),
      avgPower: sport === 'bikeIndoor' ? num(avgPower) : undefined,
      intervalPaceSec: ip ?? undefined, intervalPower: num(intervalPower),
      hrSecondHalf: num(hr2), elevationM: sport === 'bikeOutdoor' ? num(elevation) : undefined,
      sRpe, pain: painOn ? [{ region: painRegion, score: painScore }] : undefined, note: note || undefined
    };
    result = await saveEndurance(profile, s);
    window.scrollTo(0, 0);
  }
</script>

<main>
  {#if result}
    <h1>Gespeichert</h1>
    {#if result.length === 0}
      <div class="card accent"><p class="small">Alles im grünen Bereich.</p></div>
    {/if}
    {#each result as n (n.text)}
      <div class="card" class:warn={n.kind === 'warn'} class:accent={n.kind === 'good'}>
        <p class="small">{n.text} {#if n.rule}<span class="rule">{n.rule}</span>{/if}</p>
      </div>
    {/each}
    <button class="primary block" onclick={() => onclose(true)}>Fertig</button>
  {:else}
    <div class="top">
      <button class="ghost" onclick={() => onclose(false)}>Abbrechen</button>
    </div>
    <h1>Einheit eintragen</h1>

    <div class="chips">
      {#each sports as sp (sp)}
        <button class:on={sport === sp} onclick={() => (sport = sp)}>{SPORT_LABELS[sp]}</button>
      {/each}
    </div>
    <div class="chips">
      {#each types as t (t)}
        <button class:on={type === t} onclick={() => (type = t)}>{TYPE_LABELS[t]}</button>
      {/each}
    </div>

    <div class="grid2">
      <label class="field"><span>Datum</span><input type="date" bind:value={date} max={today} /></label>
      <label class="field"><span>Dauer (min)</span><input type="number" inputmode="numeric" bind:value={duration} /></label>
    </div>
    <div class="grid2">
      <label class="field"><span>Distanz (km){sport === 'run' ? '' : ' – optional'}</span><input type="number" inputmode="decimal" step="0.01" bind:value={distance} /></label>
      <label class="field"><span>Ø-Puls</span><input type="number" inputmode="numeric" bind:value={avgHr} /></label>
    </div>
    {#if pace}<p class="small muted">Ø-Pace {paceStr(pace)}</p>{/if}

    {#if runCheck && runCheck.level !== 'ok'}
      <div class="card warn">
        <p class="small">{runCheck.text}</p>
        {#if runCheck.level === 'confirm' || runCheck.level === 'block'}
          <Toggle label="Ja, die Distanz stimmt" bind:checked={confirmLong} />
        {/if}
      </div>
    {/if}

    {#if sport === 'bikeIndoor' && profile.endurance.bikeIndoorPower}
      <label class="field"><span>Ø-Leistung (Watt)</span><input type="number" inputmode="numeric" bind:value={avgPower} /></label>
    {/if}
    {#if type === 'intervals' || type === 'tempo'}
      {#if sport === 'run'}
        <label class="field"><span>Ø-Pace der harten Abschnitte (mm:ss)</span><input type="text" inputmode="decimal" placeholder="4:20" bind:value={intervalPace} /></label>
      {:else if sport === 'bikeIndoor' && profile.endurance.bikeIndoorPower}
        <label class="field"><span>Ø-Watt der harten Abschnitte</span><input type="number" inputmode="numeric" bind:value={intervalPower} /></label>
      {/if}
    {/if}
    <details>
      <summary class="small">Mehr Werte (optional)</summary>
      <div class="grid2">
        <label class="field"><span>Max-Puls</span><input type="number" inputmode="numeric" bind:value={maxHrV} /></label>
        <label class="field"><span>Ø-Puls 2. Hälfte</span><input type="number" inputmode="numeric" bind:value={hr2} /></label>
      </div>
      {#if sport === 'bikeOutdoor'}
        <label class="field"><span>Höhenmeter</span><input type="number" inputmode="numeric" bind:value={elevation} /></label>
      {/if}
      <label class="field"><span>Notiz</span><input type="text" bind:value={note} /></label>
    </details>

    <h2>Wie anstrengend insgesamt?</h2>
    <div class="rpe"><span class="stat">{sRpe}</span> <span>{RPE[sRpe]}</span></div>
    <input type="range" min="0" max="10" bind:value={sRpe} aria-label="Anstrengung 0 bis 10" />

    <h2>Schmerzen?</h2>
    <div class="chips two">
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
    {/if}

    {#if errors.length}
      <div class="card danger" role="alert">{#each errors as e (e)}<p class="small">{e}</p>{/each}</div>
    {/if}
    <button class="primary block save" onclick={save}>Speichern</button>
  {/if}
</main>

<style>
  .top { display: flex; justify-content: space-between; }
  .chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 0; }
  .chips button { border: 1.5px solid var(--line); background: var(--surface); font-weight: 500; padding: 9px 14px; min-height: 42px; }
  .chips button.on { border-color: var(--accent); background: var(--accent-soft); font-weight: 650; }
  .chips.two button { flex: 1; }
  details { margin: 8px 0; }
  summary { color: var(--accent); font-weight: 600; cursor: pointer; }
  .rpe { display: flex; align-items: baseline; gap: 10px; }
  .lbl { display: block; font-size: 14px; color: var(--muted); font-weight: 600; margin: 12px 0 6px; }
  .save { margin-top: 24px; min-height: 56px; }
  .rule { font-size: 12px; background: var(--surface-2); padding: 1px 6px; border-radius: 6px; }
</style>
