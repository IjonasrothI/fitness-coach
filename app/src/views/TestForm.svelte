<script lang="ts">
  import { criticalSpeed, ftpFrom20, paceStr, parsePace, predictTime, durationStr, TEST_LABELS } from '../lib/endurance';
  import { intenseAllowed } from '../lib/derive';
  import { saveTest } from '../lib/enduranceStore';
  import type { EnduranceTest, Profile, TestKind } from '../lib/types';

  let { profile, kind, onclose }: { profile: Profile; kind: TestKind; onclose: (saved: boolean) => void } = $props();

  let t1 = $state(3);
  let t2 = $state(12);
  let d1 = $state<number | null>(null);
  let d2 = $state<number | null>(null);
  let pace = $state('');
  let hr = $state<number | null>(null);
  let power = $state<number | null>(null);
  let error = $state<string | null>(null);

  // svelte-ignore state_referenced_locally
  const maximal = kind === 'cs' || kind === 'ftp20';
  // svelte-ignore state_referenced_locally
  const blocked = maximal && !intenseAllowed(profile);

  let csPreview = $derived(kind === 'cs' && d1 && d2 ? criticalSpeed({ t1Sec: t1 * 60, d1M: d1, t2Sec: t2 * 60, d2M: d2 }) : null);

  const INSTRUCTIONS: Record<TestKind, string[]> = {
    cs: [
      'Ausgeruht, nicht nach hartem Beintraining. 15 min einlaufen mit 3 kurzen Steigerungen.',
      'Lauf 1: 3 Minuten so weit wie möglich (gleichmäßig hart). Distanz von der Uhr notieren.',
      'Mindestens 30 min locker gehen/traben (oder an einem anderen Tag).',
      'Lauf 2: 12 Minuten so weit wie möglich. Distanz notieren.',
      'Flache Strecke ohne Ampeln, z. B. Laufbahn oder Feldweg.'
    ],
    talkRun: [
      'Locker loslaufen, alle 3–4 Minuten etwas schneller werden.',
      'Sag dabei laut einen festen Satz auf (z. B. ein Gedicht oder zählen bis 30).',
      'Notiere Pace und Puls an dem Punkt, an dem ganze Sätze gerade NICHT mehr bequem gehen.',
      'Das ist die Obergrenze für deine lockeren Läufe.'
    ],
    ftp20: [
      'Auf der Rolle, ausgeruht. 15–20 min einfahren mit 2–3 kurzen harten Antritten.',
      '20 Minuten so gleichmäßig und hart wie möglich fahren.',
      'Ø-Watt der 20 Minuten notieren. FTP = 95 % davon.',
      'Fenster auf oder Ventilator – Hitze drückt die Leistung.'
    ],
    talkBike: [
      'Locker fahren, alle 3–4 Minuten etwas mehr Druck (auf der Rolle +15–20 W).',
      'Dabei laut einen festen Satz sprechen.',
      'Notiere Puls (und Watt, wenn vorhanden) an dem Punkt, an dem ganze Sätze nicht mehr bequem gehen.'
    ]
  };

  async function save() {
    error = null;
    const base = { id: crypto.randomUUID(), profileId: profile.id, date: new Date().toISOString(), kind };
    let t: EnduranceTest;
    if (kind === 'cs') {
      if (!csPreview) { error = 'Bitte beide Distanzen in Metern eintragen (Lauf 2 muss weiter sein).'; return; }
      t = { ...base, t1Sec: t1 * 60, d1M: d1!, t2Sec: t2 * 60, d2M: d2! };
    } else if (kind === 'talkRun') {
      const p = parsePace(pace);
      if (!p) { error = 'Pace als mm:ss eingeben, z. B. 5:40.'; return; }
      t = { ...base, paceSec: p, hr: hr || undefined };
    } else if (kind === 'ftp20') {
      if (!power || power < 50 || power > 600) { error = 'Ø-Watt der 20 Minuten eintragen.'; return; }
      t = { ...base, power, hr: hr || undefined };
    } else {
      if (!hr && !power) { error = 'Mindestens Puls oder Watt eintragen.'; return; }
      t = { ...base, hr: hr || undefined, power: power || undefined };
    }
    await saveTest(t);
    onclose(true);
  }
</script>

<main>
  <button class="ghost" onclick={() => onclose(false)}>Abbrechen</button>
  <h1>{TEST_LABELS[kind]}</h1>
  {#if blocked}
    <div class="card danger"><p class="small">Maximaltests sind gesperrt, bis im Gesundheitscheck eine ärztliche Freigabe eingetragen ist. Der Talktest ist möglich.</p></div>
  {:else}
    <div class="card">
      <ol class="small">{#each INSTRUCTIONS[kind] as i (i)}<li>{i}</li>{/each}</ol>
    </div>

    {#if kind === 'cs'}
      <div class="grid2">
        <label class="field"><span>Lauf 1 (min)</span><input type="number" inputmode="numeric" bind:value={t1} /></label>
        <label class="field"><span>Distanz 1 (m)</span><input type="number" inputmode="numeric" placeholder="z. B. 850" bind:value={d1} /></label>
      </div>
      <div class="grid2">
        <label class="field"><span>Lauf 2 (min)</span><input type="number" inputmode="numeric" bind:value={t2} /></label>
        <label class="field"><span>Distanz 2 (m)</span><input type="number" inputmode="numeric" placeholder="z. B. 2900" bind:value={d2} /></label>
      </div>
      {#if csPreview}
        <div class="card accent">
          <p class="small">Critical Speed: <b>{paceStr(1000 / csPreview.cs)}</b> · Prognose 5 km ≈ {durationStr(predictTime(csPreview.cs, csPreview.dPrime, 5000))}</p>
        </div>
      {/if}
    {:else if kind === 'talkRun'}
      <div class="grid2">
        <label class="field"><span>Pace (mm:ss)</span><input type="text" inputmode="decimal" placeholder="5:40" bind:value={pace} /></label>
        <label class="field"><span>Puls</span><input type="number" inputmode="numeric" bind:value={hr} /></label>
      </div>
    {:else if kind === 'ftp20'}
      <div class="grid2">
        <label class="field"><span>Ø-Watt 20 min</span><input type="number" inputmode="numeric" bind:value={power} /></label>
        <label class="field"><span>Ø-Puls (optional)</span><input type="number" inputmode="numeric" bind:value={hr} /></label>
      </div>
      {#if power}<div class="card accent"><p class="small">FTP ≈ <b>{ftpFrom20(power)} W</b></p></div>{/if}
    {:else}
      <div class="grid2">
        <label class="field"><span>Puls</span><input type="number" inputmode="numeric" bind:value={hr} /></label>
        <label class="field"><span>Watt (Rolle, optional)</span><input type="number" inputmode="numeric" bind:value={power} /></label>
      </div>
    {/if}

    {#if error}<div class="card danger" role="alert"><p class="small">{error}</p></div>{/if}
    <button class="primary block" onclick={save}>Ergebnis speichern</button>
  {/if}
</main>

<style>
  ol { padding-left: 20px; margin: 0; }
  li { margin: 4px 0; }
</style>
