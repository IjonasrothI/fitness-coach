<script lang="ts">
  import Choice from '../components/Choice.svelte';
  import Toggle from '../components/Toggle.svelte';
  import {
    ANCHOR_LABELS, GOAL_LABELS, LEVEL_LABELS, PARQ_QUESTIONS, REGION_LABELS, WEEKDAY_LABELS
  } from '../lib/defaults';
  import { clearance, fmt, maxHr, validateProfile, weeklyMinutes } from '../lib/derive';
  import { app } from '../lib/state.svelte';
  import type { AnchorKey, BodyRegion, GoalArea, Level, Profile, Weekday } from '../lib/types';

  interface Props { initial: Profile; mode: 'new' | 'edit'; startStep?: number }
  let { initial, mode, startStep = 0 }: Props = $props();

  // Arbeitskopie, damit „Abbrechen" nichts verändert. Bewusst nur der Startwert:
  // App.svelte erzeugt den Assistenten per {#key} bei jedem Öffnen neu.
  // svelte-ignore state_referenced_locally
  let p = $state<Profile>(JSON.parse(JSON.stringify(initial)));
  // svelte-ignore state_referenced_locally
  let step = $state(startStep);
  let errors = $state<string[]>([]);
  let saving = $state(false);

  const STEPS = ['Über dich', 'Gesundheit', 'Ziele', 'Erfahrung', 'Zeit', 'Equipment', 'Ausdauer', 'Überblick'];
  const last = STEPS.length - 1;

  const sexOptions = [
    { value: 'female' as const, label: 'Weiblich' },
    { value: 'male' as const, label: 'Männlich' },
    { value: 'diverse' as const, label: 'Divers' }
  ];
  const yesNo = [{ value: 'no', label: 'Nein' }, { value: 'yes', label: 'Ja' }];
  const levelOptions = (Object.keys(LEVEL_LABELS) as Level[]).map((v) => ({ value: v, label: LEVEL_LABELS[v] }));
  const goalOptions = (Object.keys(GOAL_LABELS) as GoalArea[]).map((v) => ({ value: v, label: GOAL_LABELS[v] }));
  const dayOptions = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((v) => ({ value: v, label: WEEKDAY_LABELS[v] }));
  const minuteOptions = [20, 30, 40, 50, 60, 75, 90].map((v) => ({ value: v, label: `${v} min` }));
  const regions = Object.keys(REGION_LABELS) as BodyRegion[];
  const anchors = Object.keys(ANCHOR_LABELS) as AnchorKey[];

  // PAR-Q als Ja/Nein-Strings für die Auswahl-Komponente
  let parqAnswers = $state<Record<string, string>>(
    Object.fromEntries(PARQ_QUESTIONS.map((q) => [q.key, initial.health.parq[q.key] ? 'yes' : 'no']))
  );
  function syncParq() {
    for (const q of PARQ_QUESTIONS) p.health.parq[q.key] = parqAnswers[q.key] === 'yes';
  }

  let clearanceInfo = $derived(clearance(p));
  let hr = $derived(maxHr(p));

  function addInjury() {
    p.health.injuries.push({ region: 'knee', note: '', current: true });
  }

  function addBand() {
    const level = p.equipment.bands.length + 1;
    p.equipment.bands.push({ level, label: '' });
  }
  function removeBand(i: number) {
    p.equipment.bands.splice(i, 1);
    p.equipment.bands.forEach((b, idx) => (b.level = idx + 1));
  }

  function focusLabel(f: number) {
    if (f <= 15) return 'Fast nur Kraft';
    if (f <= 40) return 'Mehr Kraft';
    if (f < 60) return 'Ausgewogen';
    if (f < 85) return 'Mehr Ausdauer';
    return 'Fast nur Ausdauer';
  }

  function normalize(x: Profile): Profile {
    const e = x.endurance;
    if (e.restingHr == null || Number.isNaN(e.restingHr)) delete e.restingHr;
    if (e.maxHrMeasured == null || Number.isNaN(e.maxHrMeasured)) delete e.maxHrMeasured;
    x.health.injuries = x.health.injuries.filter((i) => i.region);
    x.availability.days = [...x.availability.days].sort();
    return x;
  }

  async function save() {
    syncParq();
    const out = normalize(p);
    errors = validateProfile(out);
    if (errors.length) return;
    // Neues Screening-Datum, wenn sich Antworten geändert haben
    const changed = PARQ_QUESTIONS.some((q) => out.health.parq[q.key] !== initial.health.parq[q.key]);
    if (changed || mode === 'new') out.health.screenedAt = new Date().toISOString();
    saving = true;
    await app.save(out);
    if (mode === 'new') await app.switchTo(out.id);
    saving = false;
    app.editing = null;
  }

  function next() {
    syncParq();
    if (step === 0) {
      errors = validateProfile(normalize(p)).filter((e) => /Name|Geburtsjahr|Größe|Gewicht/.test(e));
      if (errors.length) return;
    }
    errors = [];
    step = Math.min(last, step + 1);
    window.scrollTo(0, 0);
  }
  function back() {
    errors = [];
    step = Math.max(0, step - 1);
    window.scrollTo(0, 0);
  }
</script>

<main>
  <div class="top">
    <button class="ghost" onclick={() => (app.editing = null)}>Abbrechen</button>
    <span class="muted small">{step + 1} / {STEPS.length}</span>
    {#if mode === 'edit'}
      <button class="ghost" onclick={save} disabled={saving}>Speichern</button>
    {:else}<span></span>{/if}
  </div>
  <div class="progress"><div style="width: {((step + 1) / STEPS.length) * 100}%"></div></div>

  {#if mode === 'edit'}
    <nav class="steps" aria-label="Abschnitte">
      {#each STEPS as s, i (s)}
        <button class:on={i === step} onclick={() => { syncParq(); step = i; }}>{s}</button>
      {/each}
    </nav>
  {/if}

  <h1>{STEPS[step]}</h1>

  {#if step === 0}
    <p class="muted">Grunddaten für Pulsbereiche, Erholungsregeln und Startwerte.</p>
    <label class="field"><span>Name</span><input type="text" bind:value={p.name} autocomplete="given-name" /></label>
    <div class="field"><span class="lbl">Geschlecht</span><Choice options={sexOptions} bind:value={p.sex} columns={3} /></div>
    <div class="grid2">
      <label class="field"><span>Geburtsjahr</span><input type="number" inputmode="numeric" bind:value={p.birthYear} /></label>
      <label class="field"><span>Größe (cm)</span><input type="number" inputmode="numeric" bind:value={p.heightCm} /></label>
    </div>
    <label class="field"><span>Gewicht (kg)</span><input type="number" inputmode="decimal" step="0.1" bind:value={p.weightKg} /></label>

  {:else if step === 1}
    <p class="muted">Kurzer Sicherheitscheck nach dem PAR-Q+ (sinngemäß). Ein „Ja" heißt nicht, dass du nicht trainieren darfst – nur, dass intensive Einheiten erst nach ärztlicher Abklärung freigeschaltet werden.</p>
    {#each PARQ_QUESTIONS as q, i (q.key)}
      <div class="card">
        <p><b>{i + 1}.</b> {q.text}</p>
        {#if q.hint}<p class="muted small">{q.hint}</p>{/if}
        <Choice options={yesNo} bind:value={parqAnswers[q.key]} onchange={syncParq} />
      </div>
    {/each}

    {#if clearanceInfo.status === 'restricted' || clearanceInfo.status === 'cleared'}
      <div class="card warn">
        <h3>Ärztliche Abklärung empfohlen</h3>
        <p class="small">Bis zur Freigabe plant die App nur moderate Einheiten – keine Intervalle und keine Ausbelastungstests.</p>
        <Toggle
          label="Ich habe eine ärztliche Freigabe"
          bind:checked={
            () => !!p.health.medicalClearanceAt,
            (v) => { if (v) p.health.medicalClearanceAt = new Date().toISOString(); else delete p.health.medicalClearanceAt; }
          }
        />
      </div>
    {:else if clearanceInfo.status === 'regional'}
      <div class="card warn"><p class="small">{clearanceInfo.reason} Trag die Regionen unten ein.</p></div>
    {/if}

    <h2>Beschwerden & Verletzungen</h2>
    <p class="muted small">Aktuelle Probleme werden geschont, Vorgeschichte wird beobachtet.</p>
    {#each p.health.injuries as inj, i (i)}
      <div class="card">
        <label class="field"><span>Region</span>
          <select bind:value={inj.region}>
            {#each regions as r (r)}<option value={r}>{REGION_LABELS[r]}</option>{/each}
          </select>
        </label>
        <label class="field"><span>Was genau?</span><input type="text" bind:value={inj.note} placeholder="z. B. Patellasehne bei tiefen Kniebeugen" /></label>
        <Toggle label="Aktuell problematisch" bind:checked={inj.current} />
        <button class="ghost" onclick={() => p.health.injuries.splice(i, 1)}>Entfernen</button>
      </div>
    {/each}
    <button class="block" onclick={addInjury}>+ Beschwerde hinzufügen</button>
    <label class="field"><span>Sonstiges (optional)</span><textarea bind:value={p.health.notes}></textarea></label>

  {:else if step === 2}
    <p class="muted">Woran soll die App vor allem arbeiten?</p>
    <div class="field">
      <span class="lbl">Schwerpunkt: <b>{focusLabel(p.goals.focus)}</b></span>
      <input type="range" min="0" max="100" step="5" bind:value={p.goals.focus} aria-label="Schwerpunkt Kraft bis Ausdauer" />
      <div class="row small muted"><span>Kraft</span><span style="text-align:right">Ausdauer</span></div>
    </div>
    <div class="field"><span class="lbl">Ziele (mehrere möglich)</span>
      <Choice options={goalOptions} bind:values={p.goals.areas} multi columns={1} />
    </div>
    <label class="field"><span>Konkretes Ziel (optional)</span>
      <input type="text" bind:value={p.goals.specificGoal} placeholder="z. B. 10 km unter 50 min, 20 saubere Liegestütze" />
    </label>
    <label class="field"><span>Einheiten pro Woche als Ziel: <b>{p.goals.sessionsPerWeek}</b></span>
      <input type="range" min="1" max="10" bind:value={p.goals.sessionsPerWeek} />
    </label>
    <p class="muted small">Das ist dein Prozessziel. Die App feiert Regelmäßigkeit, nicht Perfektion – eine ausgelassene Einheit pro Woche bricht keine Serie.</p>

  {:else if step === 3}
    <p class="muted">Bestimmt Startniveau und Progressionstempo.</p>
    <div class="field"><span class="lbl">Krafttraining</span><Choice options={levelOptions} bind:value={p.experience.strength} /></div>
    <div class="field"><span class="lbl">Laufen</span><Choice options={levelOptions} bind:value={p.experience.running} /></div>
    <div class="field"><span class="lbl">Radfahren</span><Choice options={levelOptions} bind:value={p.experience.cycling} /></div>
    <div class="grid2">
      <label class="field"><span>Laufen km/Woche (aktuell)</span><input type="number" inputmode="decimal" bind:value={p.experience.runKmPerWeek} /></label>
      <label class="field"><span>Rad h/Woche (aktuell)</span><input type="number" inputmode="decimal" step="0.5" bind:value={p.experience.cycleHoursPerWeek} /></label>
    </div>
    <label class="field"><span>Längster Lauf der letzten 30 Tage (km)</span>
      <input type="number" inputmode="decimal" step="0.5" bind:value={p.experience.longestRunLast30dKm} />
    </label>
    <p class="muted small">Wichtig: Der nächste lange Lauf soll diesen Wert um höchstens 10 % überschreiten (Frandsen 2025).</p>

  {:else if step === 4}
    <p class="muted">Deine typische Woche. Du kannst später jede Woche und jeden Tag einzeln anpassen – die App lernt außerdem, wie viel Zeit du wirklich nutzt.</p>
    <div class="field"><span class="lbl">Typische Trainingstage</span><Choice options={dayOptions} bind:values={p.availability.days} multi columns={7} /></div>
    <div class="field"><span class="lbl">Typische Dauer pro Einheit</span><Choice options={minuteOptions} bind:value={p.availability.typicalMinutes} columns={4} /></div>
    <Toggle label="Zwei Einheiten an einem Tag möglich" hint="z. B. morgens Kraft, abends Lauf (≥ 3 h Abstand)" bind:checked={p.availability.allowDoubleSessions} />
    <div class="card accent"><span class="stat">{fmt(weeklyMinutes(p) / 60)} h</span> <span class="muted">pro Woche als Ausgangswert</span></div>

  {:else if step === 5}
    <p class="muted">Die App baut ihre Übungsleitern aus genau diesem Material.</p>
    <label class="field"><span>Kurzhanteln (kg, durch Komma getrennt)</span>
      <input type="text" inputmode="decimal"
        bind:value={() => p.equipment.dumbbellsKg.join(', '), (v) => (p.equipment.dumbbellsKg = parseList(v))} />
    </label>
    <label class="field"><span>Kettlebells (kg)</span>
      <input type="text" inputmode="decimal"
        bind:value={() => p.equipment.kettlebellsKg.join(', '), (v) => (p.equipment.kettlebellsKg = parseList(v))} />
    </label>
    <h2>Widerstandsbänder (geschlossen)</h2>
    {#each p.equipment.bands as b, i (i)}
      <div class="row band">
        <span class="lvl">Stufe {b.level}</span>
        <input type="text" bind:value={b.label} aria-label="Bezeichnung Stufe {b.level}" />
        <button class="ghost" aria-label="Band entfernen" onclick={() => removeBand(i)}>✕</button>
      </div>
    {/each}
    <button class="block" onclick={addBand}>+ Band hinzufügen</button>

    <h2>Ankerpunkte</h2>
    <p class="muted small">Damit werden Zugübungen (Rücken) und Übungen für die hintere Oberschenkelmuskulatur möglich.</p>
    {#each anchors as a (a)}
      <Toggle label={ANCHOR_LABELS[a]} bind:checked={p.equipment.anchors[a]} />
    {/each}

  {:else if step === 6}
    <p class="muted">Du liest Pulswerte einfach von deiner Uhr ab und trägst sie ein. Alles hier ist optional, macht die Zonen aber genauer.</p>
    <div class="grid2">
      <label class="field"><span>Ruhepuls</span><input type="number" inputmode="numeric" placeholder="z. B. 52" bind:value={p.endurance.restingHr} /></label>
      <label class="field"><span>Höchster gesehener Puls</span><input type="number" inputmode="numeric" placeholder="z. B. 188" bind:value={p.endurance.maxHrMeasured} /></label>
    </div>
    <div class="card">
      <span class="stat-label">Maximalpuls, mit dem die App rechnet</span>
      <div class="stat">{hr.value} {#if hr.uncertainty}<span class="small muted">± {hr.uncertainty}</span>{/if}</div>
      <p class="small muted">
        {hr.source === 'measured'
          ? 'Gemessen – genauer als jede Formel.'
          : 'Geschätzt (Tanaka: 208 − 0,7 × Alter). Wird automatisch ersetzt, sobald du einen höheren Wert einträgst.'}
      </p>
    </div>
    <h2>Laufen & Rad</h2>
    <Toggle label="Laufen draußen" bind:checked={p.endurance.runOutdoor} />
    <Toggle label="Rennrad draußen (Sommer)" bind:checked={p.endurance.bikeOutdoor} />
    <Toggle label="Rolle indoor (Winter)" bind:checked={p.endurance.bikeIndoor} />
    {#if p.endurance.bikeIndoor}
      <Toggle label="Rolle zeigt Watt an" hint="Dann trainierst du indoor nach Watt-Zonen" bind:checked={p.endurance.bikeIndoorPower} />
    {/if}
    {#if p.sex !== 'male'}
      <h2>Zyklus (optional)</h2>
      <Toggle
        label="Zyklus-Symptome erfassen"
        hint="Der Plan wird nicht nach Zyklusphase geändert (Studienlage). Symptome fließen wie andere Tagesbefinden ein; nach einigen Zyklen zeigt die App persönliche Muster."
        bind:checked={p.cycleTrackingConsent}
      />
    {/if}

  {:else if step === 7}
    <div class="card">
      <h3>{p.name || '–'}, {new Date().getFullYear() - p.birthYear} Jahre</h3>
      <p class="small muted">{p.heightCm} cm · {p.weightKg} kg</p>
    </div>
    <div class="card" class:warn={clearanceInfo.status !== 'clear'}>
      <h3>Gesundheit</h3>
      <p class="small">
        {#if clearanceInfo.status === 'clear'}Keine Einschränkungen.
        {:else if clearanceInfo.status === 'regional'}Regionale Schonung: {p.health.injuries.filter((i) => i.current).map((i) => REGION_LABELS[i.region]).join(', ') || 'Region noch eintragen'}.
        {:else if clearanceInfo.status === 'restricted'}Intensive Einheiten gesperrt bis zur ärztlichen Freigabe.
        {:else}Ärztlich freigegeben.{/if}
      </p>
    </div>
    <div class="card">
      <h3>Ziele</h3>
      <p class="small">{focusLabel(p.goals.focus)} · {p.goals.areas.map((a) => GOAL_LABELS[a]).join(', ')}</p>
      {#if p.goals.specificGoal}<p class="small">„{p.goals.specificGoal}"</p>{/if}
    </div>
    <div class="card">
      <h3>Woche</h3>
      <p class="small">{p.availability.days.map((d) => WEEKDAY_LABELS[d]).join(', ')} · je ~{p.availability.typicalMinutes} min · Ziel {p.goals.sessionsPerWeek} Einheiten</p>
    </div>
    {#if errors.length === 0}
      <p class="muted small">Als Nächstes plant die App Einstiegstests (Kraft-Einstufung, Talktest, Critical Speed), verteilt auf die ersten 1–2 Wochen.</p>
    {/if}
  {/if}

  {#if errors.length}
    <div class="card danger" role="alert">
      {#each errors as e (e)}<p class="small">{e}</p>{/each}
    </div>
  {/if}

  <div class="nav">
    {#if step > 0}<button onclick={back}>Zurück</button>{/if}
    {#if step < last}
      <button class="primary" onclick={next}>Weiter</button>
    {:else}
      <button class="primary" onclick={save} disabled={saving}>{mode === 'new' ? 'Profil anlegen' : 'Speichern'}</button>
    {/if}
  </div>
</main>

<script module lang="ts">
  function parseList(v: string): number[] {
    return v.split(/[,;\s]+/).map((s) => Number(s.replace(',', '.'))).filter((n) => n > 0);
  }
</script>

<style>
  .top { display: flex; justify-content: space-between; align-items: center; }
  .progress { height: 4px; background: var(--surface-2); border-radius: 2px; overflow: hidden; margin: 4px 0 8px; }
  .progress div { height: 100%; background: var(--accent); transition: width 0.2s; }
  .steps { display: flex; gap: 6px; overflow-x: auto; padding: 6px 0; scrollbar-width: none; }
  .steps button { min-height: 36px; padding: 6px 12px; font-size: 14px; white-space: nowrap; font-weight: 500; }
  .steps button.on { background: var(--accent); color: var(--accent-ink); }
  .field { display: block; margin: 14px 0; }
  .lbl { display: block; font-size: 14px; color: var(--muted); margin-bottom: 6px; font-weight: 600; }
  .band { margin: 8px 0; }
  .band .lvl { flex: none; width: 70px; font-weight: 600; }
  .band button { flex: none; min-width: 44px; }
  .nav {
    position: sticky; bottom: calc(8px + env(safe-area-inset-bottom)); display: flex; gap: 10px;
    margin-top: 24px; padding-top: 8px; background: linear-gradient(transparent, var(--bg) 30%);
  }
  .nav button { flex: 1; }
</style>
