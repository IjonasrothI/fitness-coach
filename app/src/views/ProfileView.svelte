<script lang="ts">
  import { GOAL_LABELS, LEVEL_LABELS, WEEKDAY_LABELS, ANCHOR_LABELS } from '../lib/defaults';
  import { clearance } from '../lib/derive';
  import { app } from '../lib/state.svelte';
  import { MOTIVATION_LABELS } from '../lib/formats';
  import type { AnchorKey, Profile } from '../lib/types';

  let { profile }: { profile: Profile } = $props();

  const sections = [
    { step: 0, title: 'Über dich', text: (p: Profile) => `${p.birthYear} · ${p.heightCm} cm · ${p.weightKg} kg` },
    { step: 1, title: 'Gesundheit', text: (p: Profile) => ({ clear: 'Keine Einschränkungen', regional: 'Regionale Schonung', restricted: 'Intensiv gesperrt', cleared: 'Ärztlich freigegeben' })[clearance(p).status] + (p.health.injuries.length ? ` · ${p.health.injuries.length} Beschwerde(n)` : '') },
    { step: 2, title: 'Ziele & Motivation', text: (p: Profile) => p.goals.areas.map((a) => GOAL_LABELS[a]).join(', ') + (p.motivation ? ` · ${MOTIVATION_LABELS[p.motivation]}` : '') },
    { step: 3, title: 'Erfahrung', text: (p: Profile) => `Kraft: ${LEVEL_LABELS[p.experience.strength]}` },
    { step: 4, title: 'Zeit', text: (p: Profile) => `${p.availability.days.map((d) => WEEKDAY_LABELS[d]).join(' ')} · ${p.availability.typicalMinutes} min` },
    { step: 5, title: 'Equipment', text: (p: Profile) => `${p.equipment.bands.length} Bänder · Anker: ${(Object.keys(p.equipment.anchors) as AnchorKey[]).filter((k) => p.equipment.anchors[k]).map((k) => ANCHOR_LABELS[k].split(' (')[0]).join(', ') || 'keine'}` },
    { step: 6, title: 'Ausdauer', text: (p: Profile) => `Ruhepuls ${p.endurance.restingHr ?? '–'} · Max ${p.endurance.maxHrMeasured ?? 'geschätzt'}` }
  ];
</script>

<main>
  <h1>Profil</h1>
  <p class="muted">Alles, was du hier änderst, fließt sofort in die Planung ein.</p>
  <ul class="list card">
    {#each sections as s (s.step)}
      <li>
        <button class="item" onclick={() => (app.editing = { profile, mode: 'edit', step: s.step })}>
          <span>
            <b>{s.title}</b>
            <span class="small muted">{s.text(profile)}</span>
          </span>
          <span class="chev" aria-hidden="true">›</span>
        </button>
      </li>
    {/each}
  </ul>
</main>

<style>
  .item {
    width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    background: none; padding: 4px 0; text-align: left; font-weight: 400; min-height: 52px;
  }
  .item > span:first-child { display: flex; flex-direction: column; min-width: 0; }
  .item .small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chev { font-size: 24px; color: var(--muted); flex: none; }
</style>
