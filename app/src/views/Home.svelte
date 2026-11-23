<script lang="ts">
  import { GOAL_LABELS, REGION_LABELS } from '../lib/defaults';
  import { ageOn, clearance, deloadEveryWeeks, fmt, maxHr, rescreenDue, weeklyMinutes } from '../lib/derive';
  import { app } from '../lib/state.svelte';
  import type { Profile } from '../lib/types';

  let { profile }: { profile: Profile } = $props();

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

<main>
  <p class="muted small">{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
  <h1>{greeting}, {profile.name}</h1>

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
  <p class="small muted">Der tägliche Check-in und die automatische Wochenplanung folgen in den nächsten Meilensteinen.</p>

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
