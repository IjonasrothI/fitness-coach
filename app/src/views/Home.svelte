<script lang="ts">
  import { GOAL_LABELS, REGION_LABELS } from '../lib/defaults';
  import { ageOn, clearance, deloadEveryWeeks, fmt, maxHr, rescreenDue, weeklyMinutes } from '../lib/derive';
  import { onMount } from 'svelte';
  import { checkinHistory, getCheckIn, saveCheckIn } from '../lib/checkinStore';
  import { amenorrheaHint, LIGHT_LABELS, painAdvice, readiness, todayKey, type Readiness } from '../lib/readiness';
  import { app } from '../lib/state.svelte';
  import type { CheckIn, Profile } from '../lib/types';
  import CheckInForm from './CheckInForm.svelte';

  let { profile }: { profile: Profile } = $props();

  let today = $state<CheckIn | undefined>(undefined);
  let history = $state<CheckIn[]>([]);
  let ready = $state<Readiness | null>(null);
  let formOpen = $state(false);
  let loaded = $state(false);

  async function loadCheckIn() {
    today = await getCheckIn(profile.id);
    history = await checkinHistory(profile.id, 40);
    ready = today ? readiness(today, history, profile) : null;
    loaded = true;
  }
  onMount(loadCheckIn);

  async function override(on: boolean) {
    if (!today) return;
    await saveCheckIn({ ...today, override: on });
    await loadCheckIn();
  }

  // Ampel der letzten 14 Tage
  let trend = $derived.by(() => {
    const out: { date: string; light: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = todayKey(new Date(Date.now() - i * 86400000));
      const c = history.find((h) => h.date === d);
      out.push({ date: d, light: c ? readiness(c, history, profile).light : 'none' });
    }
    return out;
  });
  let hints = $derived.by(() => {
    const out: string[] = [];
    const regions = new Set(history.flatMap((h) => h.pain.map((x) => x.region)));
    for (const r of regions) {
      const a = painAdvice(history, r, todayKey());
      if (a) out.push(`${REGION_LABELS[r]}: ${a}`);
    }
    if (profile.cycleTrackingConsent) {
      const a = amenorrheaHint(history, todayKey());
      if (a) out.push(a);
    }
    return out;
  });

  let c = $derived(clearance(profile));
  let hr = $derived(maxHr(profile));
  let deload = $derived(deloadEveryWeeks(profile.birthYear));
  let currentInjuries = $derived(profile.health.injuries.filter((i) => i.current));
  let newWeight = $state<number | null>(null);

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 11 ? 'Guten Morgen' : h < 18 ? 'Hallo' : 'Guten Abend';
  })();

  async function saveWeight() {
    if (!newWeight || newWeight < 30 || newWeight > 250) return;
    await app.save({ ...profile, weightKg: Math.round(newWeight * 10) / 10 });
    newWeight = null;
  }

  function edit(step: number) {
    app.editing = { profile, mode: 'edit', step };
  }
</script>

{#if formOpen}
  <CheckInForm {profile} existing={today} onclose={async (saved) => { formOpen = false; if (saved) await loadCheckIn(); window.scrollTo(0, 0); }} />
{:else}
<main>
  <p class="muted small">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
  <h1>{greeting}, {profile.name}</h1>

  {#if loaded && !today}
    <div class="card accent">
      <h3>Morgen-Check</h3>
      <p class="small">30 Sekunden: Schlaf, Energie, Muskelkater, Stress, Lust. Danach passt die App das Training an deine Tagesform an.</p>
      <button class="primary block" onclick={() => (formOpen = true)}>Check-in starten</button>
    </div>
  {:else if ready}
    <div class="card light {ready.light}">
      <div class="lighthead">
        <span class="dot" aria-hidden="true"></span>
        <h3>{ready.caps.noTraining ? 'Heute kein Training' : LIGHT_LABELS[ready.light]}</h3>
      </div>
      {#each ready.reasons as r (r)}<p class="small">{r}</p>{/each}
      {#if !ready.reasons.length}<p class="small">Alles im normalen Bereich. Viel Spaß beim Training!</p>{/if}
      <div class="row actions">
        <button class="ghost" onclick={() => (formOpen = true)}>Check-in ändern</button>
        {#if !ready.caps.noTraining && ready.light !== 'green' && !ready.overridden}
          <button class="ghost" onclick={() => override(true)}>Ich fühle mich trotzdem fit</button>
        {:else if ready.overridden}
          <button class="ghost" onclick={() => override(false)}>Übersteuern zurücknehmen</button>
        {/if}
      </div>
    </div>
  {/if}
  {#if history.length > 1}
    <div class="trend" aria-label="Tagesform der letzten 14 Tage">
      {#each trend as t (t.date)}<span class="tdot {t.light}" title={t.date}></span>{/each}
    </div>
  {/if}
  {#each hints as h (h)}<div class="card warn"><p class="small">{h}</p></div>{/each}

  {#if c.status === 'restricted'}
    <div class="card danger">
      <h3>Intensive Einheiten gesperrt</h3>
      <p class="small">Mindestens eine Antwort im Gesundheitscheck spricht für eine ärztliche Abklärung. Bis dahin plant die App nur moderate Einheiten.</p>
      <button class="ghost" onclick={() => edit(1)}>Freigabe eintragen</button>
    </div>
  {/if}
  {#if rescreenDue(profile)}
    <div class="card warn">
      <h3>Gesundheitscheck erneuern</h3>
      <p class="small">Der letzte Check ist über ein Jahr her.</p>
      <button class="ghost" onclick={() => edit(1)}>Jetzt prüfen</button>
    </div>
  {/if}
  {#if app.backupReminder}
    <div class="card warn">
      <h3>Sicherung fällig</h3>
      <p class="small">Deine Daten liegen nur auf diesem iPhone. Speichere alle 2 Wochen eine Sicherung in „Dateien".</p>
      <button class="ghost" onclick={() => (app.view = 'data')}>Zur Sicherung</button>
    </div>
  {/if}

  <div class="card accent">
    <h3>Krafttraining</h3>
    <p class="small">Einheit passend zu deiner Zeit – die App wählt die Übungen nach deinem Wochenvolumen.</p>
    <button class="primary block" onclick={() => (app.view = 'strength')}>Zum Krafttraining</button>
  </div>
  <div class="card">
    <h3>Laufen & Rad</h3>
    <p class="small">Vorschlag für heute, Zonen aus deinen Feldtests und Schutz vor zu großen Sprüngen beim langen Lauf.</p>
    <button class="block" onclick={() => (app.view = 'endurance')}>Zur Ausdauer</button>
  </div>
  <p class="small muted">Die automatische Wochenplanung folgt im nächsten Meilenstein.</p>

  <h2>Dein Ausgangspunkt</h2>
  <div class="grid2">
    <div class="card">
      <div class="stat-label">Wochenzeit</div>
      <div class="stat">{fmt(weeklyMinutes(profile) / 60)} h</div>
      <div class="small muted">{profile.availability.days.length} Tage à {profile.availability.typicalMinutes} min</div>
    </div>
    <div class="card">
      <div class="stat-label">Maximalpuls</div>
      <div class="stat">{hr.value}{#if hr.uncertainty}<span class="small muted"> ±{hr.uncertainty}</span>{/if}</div>
      <div class="small muted">{hr.source === 'measured' ? 'gemessen' : 'geschätzt'}</div>
    </div>
    <div class="card">
      <div class="stat-label">Längster Lauf (30 Tage)</div>
      <div class="stat">{fmt(profile.experience.longestRunLast30dKm)} km</div>
      <div class="small muted">nächster max. {fmt(profile.experience.longestRunLast30dKm * 1.1)} km</div>
    </div>
    <div class="card">
      <div class="stat-label">Entlastungswoche alle</div>
      <div class="stat">{deload[0]}–{deload[1]} Wo.</div>
      <div class="small muted">angepasst an {ageOn(profile.birthYear)} Jahre</div>
    </div>
  </div>

  <div class="card">
    <h3>Ziele</h3>
    <p class="small">{profile.goals.areas.map((a) => GOAL_LABELS[a]).join(' · ')}</p>
    {#if profile.goals.specificGoal}<p class="small muted">„{profile.goals.specificGoal}"</p>{/if}
    {#if currentInjuries.length}
      <p class="small">Geschont: {currentInjuries.map((i) => REGION_LABELS[i.region]).join(', ')}</p>
    {/if}
  </div>

  <h2>Gewicht</h2>
  <div class="card">
    <p class="small muted">Aktuell {fmt(profile.weightKg)} kg. Am besten einmal pro Woche morgens wiegen – die App nutzt den geglätteten Trend.</p>
    <div class="row">
      <input type="number" inputmode="decimal" step="0.1" placeholder="kg" bind:value={newWeight} aria-label="Neues Gewicht in kg" />
      <button class="primary" onclick={saveWeight} disabled={!newWeight}>Eintragen</button>
    </div>
  </div>
</main>
{/if}

<style>
  .light { border-width: 0; }
  .light.green { background: var(--accent-soft); }
  .light.yellow { background: var(--warn-soft); }
  .light.red { background: var(--danger-soft); }
  .lighthead { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .lighthead h3 { margin: 0; }
  .dot { width: 14px; height: 14px; border-radius: 50%; flex: none; }
  .green .dot { background: var(--accent); }
  .yellow .dot { background: var(--warn); }
  .red .dot { background: var(--danger); }
  .actions { flex-wrap: wrap; justify-content: space-between; }
  .actions button { flex: none; min-height: 40px; }
  .trend { display: flex; gap: 5px; justify-content: center; margin: 4px 0 12px; }
  .tdot { width: 14px; height: 14px; border-radius: 50%; background: var(--surface-2); }
  .tdot.green { background: var(--accent); }
  .tdot.yellow { background: var(--warn); }
  .tdot.red { background: var(--danger); }
</style>
