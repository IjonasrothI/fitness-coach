<script lang="ts">
  import { onMount } from 'svelte';
  import { SPORT_LABELS, TYPE_LABELS, strengthMinutes } from '../lib/endurance';
  import { listEndurance } from '../lib/enduranceStore';
  import { addDays, itemStatus, mondayOf, weekMinutes, type ItemStatus } from '../lib/planner';
  import { todayKey } from '../lib/readiness';
  import { app } from '../lib/state.svelte';
  import { recentSessions } from '../lib/training';
  import type { ChangeLogEntry, EnduranceSession, EnduranceType, PlannedItem, Profile, StrengthSession, WeekPlan } from '../lib/types';
  import { editItem, getWeek, moveItem, rebuildWeek, setAvailability, setDeload, undoWeekChange, weekChanges } from '../lib/weekStore';

  let { profile }: { profile: Profile } = $props();

  let weekStart = $state(mondayOf(todayKey()));
  let week = $state<WeekPlan | null>(null);
  let strength = $state<StrengthSession[]>([]);
  let endurance = $state<EnduranceSession[]>([]);
  let changes = $state<ChangeLogEntry[]>([]);
  let editDay = $state<string | null>(null);
  let sheet = $state<{ item: PlannedItem; date: string } | null>(null);
  let busy = $state(false);
  const today = todayKey();

  async function load() {
    week = await getWeek(profile, weekStart);
    strength = await recentSessions(profile.id, 60);
    endurance = await listEndurance(profile.id);
    changes = await weekChanges(profile.id);
  }
  onMount(load);

  async function go(delta: number) {
    weekStart = addDays(weekStart, 7 * delta);
    await load();
  }

  const MINUTES = [0, 20, 30, 45, 60, 75, 90, 120];
  const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('de-DE', { day: 'numeric', month: 'numeric' });

  async function setMin(date: string, m: number) {
    if (!week) return;
    week = await setAvailability(profile, week, date, m);
    editDay = null;
  }
  async function move(to: string) {
    if (!week || !sheet) return;
    week = await moveItem(profile, week, sheet.item.id, to);
    sheet = null;
  }
  async function changeType(t: EnduranceType) {
    if (!week || !sheet) return;
    week = await editItem(week, sheet.item.id, { type: t });
    sheet = null;
  }
  async function remove() {
    if (!week || !sheet) return;
    week = await editItem(week, sheet.item.id, { remove: true });
    sheet = null;
  }
  async function startNow() {
    if (!sheet) return;
    const it = sheet.item;
    sheet = null;
    if (it.kind === 'strength') {
      busy = true;
      app.strengthMinutes = it.minutes;
      app.view = 'strength';
      window.scrollTo(0, 0);
      busy = false;
    } else {
      app.plannedEndurance = it;
      app.view = 'endurance';
    }
  }
  async function toggleDeload() {
    if (!week) return;
    week = await setDeload(profile, week, !week.deload);
    changes = await weekChanges(profile.id);
  }
  async function rebuild() {
    if (!week) return;
    week = await rebuildWeek(profile, week);
  }
  async function undo(c: ChangeLogEntry) {
    if (await undoWeekChange(profile, c)) await load();
  }

  function status(it: PlannedItem, date: string, items: PlannedItem[]): ItemStatus {
    return itemStatus(it, date, today, strength, endurance, items);
  }
  function label(it: PlannedItem): string {
    if (it.kind === 'strength') return 'Kraft';
    return `${it.sport ? SPORT_LABELS[it.sport] : 'Ausdauer'} · ${it.type ? TYPE_LABELS[it.type] : ''}`;
  }
  let totals = $derived(week ? weekMinutes(week.days) : { strength: 0, endurance: 0 });
  let doneMin = $derived.by(() => {
    if (!week) return 0;
    const end = addDays(week.weekStart, 7);
    const s = strength.filter((x) => x.status === 'done' && todayKey(new Date(x.startedAt)) >= week!.weekStart && todayKey(new Date(x.startedAt)) < end).reduce((t, x) => t + strengthMinutes(x), 0);
    const e = endurance.filter((x) => todayKey(new Date(x.date)) >= week!.weekStart && todayKey(new Date(x.date)) < end).reduce((t, x) => t + x.durationMin, 0);
    return s + e;
  });
  const STATUS_LABEL: Record<ItemStatus, string> = { done: 'erledigt', missed: 'ausgefallen', today: 'heute', planned: '' };
</script>

<main>
  <div class="head">
    <button class="ghost nav" aria-label="Vorige Woche" onclick={() => go(-1)}>‹</button>
    <h1>Woche {week ? `${fmtDate(week.weekStart)}–${fmtDate(addDays(week.weekStart, 6))}` : ''}</h1>
    <button class="ghost nav" aria-label="Nächste Woche" onclick={() => go(1)}>›</button>
  </div>

  {#if week}
    <div class="card" class:warn={week.deload}>
      <p class="small"><b>{week.deload ? 'Entlastungswoche' : `Blockwoche ${week.blockWeek}`}</b> · Kraft {totals.strength} min · Ausdauer {totals.endurance} min · erledigt {doneMin} min</p>
      {#each week.why as w (w)}<p class="small muted">{w}</p>{/each}
      <button class="ghost" onclick={() => (app.editing = { profile, mode: 'edit', step: 2 })}>Anzahl und Aufteilung ändern</button>
    </div>

    {#each week.days as day, i (day.date)}
      <div class="day" class:today={day.date === today} class:past={day.date < today}>
        <div class="dayhead">
          <span><b>{WD[i]}</b> <span class="muted small">{fmtDate(day.date)}</span></span>
          {#if day.date >= today}
            <button class="time" onclick={() => (editDay = editDay === day.date ? null : day.date)}>{day.availableMin ? `${day.availableMin} min Zeit` : 'keine Zeit'}</button>
          {/if}
        </div>
        {#if editDay === day.date}
          <div class="mins">
            {#each MINUTES as m (m)}<button class:on={day.availableMin === m} onclick={() => setMin(day.date, m)}>{m === 0 ? 'frei' : m}</button>{/each}
          </div>
        {/if}
        {#each day.items as it (it.id)}
          {@const st = status(it, day.date, day.items)}
          <button class="item {it.kind} {st}" onclick={() => (sheet = { item: it, date: day.date })}>
            <span>{label(it)}{it.userEdited ? ' ✎' : ''}</span>
            <span class="small">{it.minutes} min {STATUS_LABEL[st] ? `· ${STATUS_LABEL[st]}` : ''}</span>
          </button>
        {/each}
        {#if !day.items.length && day.availableMin > 0}<p class="small muted">Frei – Puffertag, falls etwas ausfällt</p>{/if}
      </div>
    {/each}

    <div class="row actions">
      <button onclick={toggleDeload}>{week.deload ? 'Entlastung verschieben' : 'Entlastungswoche jetzt'}</button>
      <button onclick={rebuild}>Neu planen</button>
    </div>
    <p class="small muted">Tippe auf „Zeit", um einen Tag zu ändern – die restliche Woche wird automatisch neu verteilt. Verpasstes wird nicht nachgeholt.</p>

    {#if changes.length}
      <h2>Anpassungen</h2>
      {#each changes as c (c.id)}
        <div class="card" class:undone={c.undone}>
          <p class="small"><b>{c.what}</b></p>
          <p class="small muted">{c.why} <span class="rule">{c.ruleId}</span></p>
          {#if c.undone}<p class="small">Zurückgenommen.</p>{:else}<button class="ghost" onclick={() => undo(c)}>Rückgängig</button>{/if}
        </div>
      {/each}
    {/if}
  {:else}
    <p class="muted">Lade …</p>
  {/if}
</main>

{#if sheet && week}
  <div class="backdrop" role="presentation" onclick={() => (sheet = null)}></div>
  <div class="sheet" role="dialog" aria-modal="true">
    <h2>{label(sheet.item)} · {sheet.item.minutes} min</h2>
    {#if sheet.date === today}
      <button class="primary block" disabled={busy} onclick={startNow}>Jetzt starten</button>
    {/if}
    {#if sheet.item.kind === 'endurance'}
      <span class="lbl">Art ändern</span>
      <div class="mins">
        {#each ['easy', 'long', 'tempo', 'intervals'] as t (t)}
          <button class:on={sheet.item.type === t} onclick={() => changeType(t as EnduranceType)}>{TYPE_LABELS[t as EnduranceType]}</button>
        {/each}
      </div>
    {/if}
    <span class="lbl">Verschieben auf</span>
    <div class="mins">
      {#each week.days.filter((x) => x.date >= today && x.date !== sheet!.date) as d (d.date)}
        <button onclick={() => move(d.date)}>{WD[week.days.indexOf(d)]}</button>
      {/each}
    </div>
    <div class="row">
      <button class="danger" onclick={remove}>Entfernen</button>
      <button onclick={() => (sheet = null)}>Schließen</button>
    </div>
  </div>
{/if}

<style>
  .head { display: flex; align-items: center; justify-content: space-between; }
  .head h1 { font-size: 24px; text-align: center; flex: 1; }
  .nav { font-size: 32px; min-width: 44px; }
  .day { border-bottom: 1px solid var(--line); padding: 10px 0; }
  .day.today { background: var(--surface); border-radius: var(--radius); padding: 10px 12px; border: 1.5px solid var(--accent); }
  .day.past { opacity: 0.75; }
  .dayhead { display: flex; justify-content: space-between; align-items: center; }
  .time { background: none; color: var(--accent); font-size: 14px; min-height: 36px; padding: 4px 0; font-weight: 600; }
  .mins { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .mins button { border: 1.5px solid var(--line); background: var(--surface); font-size: 14px; padding: 6px 12px; min-height: 38px; font-weight: 500; }
  .mins button.on { border-color: var(--accent); background: var(--accent-soft); font-weight: 650; }
  .item {
    width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 6px;
    text-align: left; font-weight: 600; font-size: 15px; padding: 10px 12px; min-height: 44px;
    background: var(--surface-2); border-left: 4px solid var(--muted);
  }
  .item.strength { border-left-color: var(--accent); }
  .item.endurance { border-left-color: var(--warn); }
  .item.done { opacity: 0.6; }
  .item.done span:first-child::before { content: '✓ '; color: var(--accent); }
  .item.missed { opacity: 0.45; text-decoration: line-through; }
  .actions { margin-top: 16px; }
  .undone { opacity: 0.6; }
  .rule { font-size: 12px; background: var(--surface-2); padding: 1px 6px; border-radius: 6px; }
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 10; }
  .sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 11; background: var(--surface);
    border-radius: 20px 20px 0 0; padding: 20px 16px calc(16px + env(safe-area-inset-bottom)); max-width: 560px; margin: 0 auto;
  }
  .sheet h2 { margin-top: 0; }
  .lbl { display: block; font-size: 14px; color: var(--muted); font-weight: 600; margin-top: 14px; }
  .sheet .row { margin-top: 16px; }
</style>
