<script lang="ts">
  import ExerciseAnim from '../components/ExerciseAnim.svelte';
  import Toggle from '../components/Toggle.svelte';
  import { animId, defaultSetup, MAX_EVENING, MOBILITY_BY_ID, minutesLabel, ROUTINE_LABELS, routineCatalog, routineSeconds, routineSequence, routineSetup } from '../lib/mobility';
  import { app } from '../lib/state.svelte';
  import type { Profile, RoutineItem, RoutineKind } from '../lib/types';

  let { profile, kind, onclose }: { profile: Profile; kind: RoutineKind; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const start = routineSetup(profile, kind);
  let items = $state<RoutineItem[]>(start.items.map((x) => ({ ...x })));
  let autoStart = $state(start.autoStart);
  let rounds = $state(start.rounds ?? 1);
  let restSec = $state(start.restSec ?? 6);
  let open = $state<string | null>(null);
  let adding = $state(false);

  let available = $derived(routineCatalog(kind).filter((m) => !items.some((x) => x.id === m.id)));
  let total = $derived(routineSeconds(routineSequence(items, rounds), kind === 'evening' ? restSec : undefined));
  let tooLong = $derived(total > 15 * 60);
  /** Abends höchstens 5 Übungen – einfach halten */
  let full = $derived(kind === 'evening' && items.length >= MAX_EVENING);

  function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const copy = [...items];
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    items = copy;
  }
  const remove = (i: number) => { items = items.filter((_, k) => k !== i); };
  const setSec = (i: number, d: number) => { items[i]!.sec = Math.max(15, Math.min(180, items[i]!.sec + d)); };
  function add(id: string) {
    items = [...items, { id, sec: MOBILITY_BY_ID[id]!.defaultSec }];
    adding = false;
  }
  function reset() {
    const d = defaultSetup(kind);
    items = d.items;
    rounds = d.rounds ?? 1;
    restSec = d.restSec ?? 6;
  }
  async function save() {
    const setup = kind === 'evening' ? { items, autoStart: false, rounds, restSec } : { items, autoStart };
    await app.save({ ...profile, routines: { ...profile.routines, [kind]: setup } });
    onclose();
  }
</script>

<main>
  <button class="ghost" onclick={onclose}>Abbrechen</button>
  <h1>{ROUTINE_LABELS[kind]} anpassen</h1>
  <p class="small muted">Die Übungen bleiben jeden Tag gleich, bis du sie hier änderst. So wird die Routine schnell zur Gewohnheit.</p>

  <div class="card">
    <p><b>{items.length} Übungen{kind === 'evening' ? ` × ${rounds} ${rounds === 1 ? 'Runde' : 'Runden'}` : ''} · ca. {minutesLabel(total)}</b></p>
    {#if tooLong}<p class="small warn">Über 15 Minuten – kürzer fällt es leichter, jeden Tag dranzubleiben.</p>{/if}
    {#if items.length === 0}<p class="small muted">Noch keine Übung – füge unten eine hinzu.</p>{/if}
    <ol class="list">
      {#each items as it, i (it.id)}
        {@const ex = MOBILITY_BY_ID[it.id]!}
        <li>
          <div class="head">
            <button class="name" onclick={() => (open = open === it.id ? null : it.id)} aria-expanded={open === it.id}>
              <b>{ex.name}</b><span class="small muted">{ex.area}</span>
            </button>
            <div class="order">
              <button aria-label="{ex.name} nach oben" disabled={i === 0} onclick={() => move(i, -1)}>↑</button>
              <button aria-label="{ex.name} nach unten" disabled={i === items.length - 1} onclick={() => move(i, 1)}>↓</button>
              <button aria-label="{ex.name} entfernen" onclick={() => remove(i)}>✕</button>
            </div>
          </div>
          <div class="dur">
            <button aria-label="kürzer" onclick={() => setSec(i, -15)}>−</button>
            <span>{it.sec} s{ex.unilateral ? ' je Seite' : ''}</span>
            <button aria-label="länger" onclick={() => setSec(i, 15)}>+</button>
          </div>
          {#if open === it.id}
            <ExerciseAnim id={animId(it.id)} label={ex.name} />
            <ul class="cues small">{#each ex.cues as c (c)}<li>{c}</li>{/each}</ul>
          {/if}
        </li>
      {/each}
    </ol>
    {#if adding && !full}
      <h3>Übung hinzufügen</h3>
      {#each available as m (m.id)}
        <button class="addrow" onclick={() => add(m.id)}>
          <span><b>{m.name}</b><br /><span class="small muted">{m.area} · {m.short}</span></span><span class="plus">+</span>
        </button>
      {/each}
      <button class="ghost" onclick={() => (adding = false)}>Schließen</button>
    {:else if full}
      <p class="small muted">Maximal {MAX_EVENING} Übungen – zum Tauschen erst eine entfernen.</p>
    {:else if available.length}
      <button class="block" onclick={() => (adding = true)}>+ Übung hinzufügen</button>
    {/if}
  </div>

  {#if kind === 'morning'}
    <div class="card">
      <Toggle label="Direkt nach dem Check-in starten" hint="Du kannst jederzeit pausieren oder überspringen" bind:checked={autoStart} />
    </div>
  {:else}
    <div class="card">
      <div class="dur"><b class="lab">Runden</b>
        <button aria-label="weniger Runden" onclick={() => (rounds = Math.max(1, rounds - 1))}>−</button>
        <span>{rounds}</span>
        <button aria-label="mehr Runden" onclick={() => (rounds = Math.min(3, rounds + 1))}>+</button>
      </div>
      <div class="dur"><b class="lab">Pause</b>
        <button aria-label="kürzere Pause" onclick={() => (restSec = Math.max(10, restSec - 5))}>−</button>
        <span>{restSec} s</span>
        <button aria-label="längere Pause" onclick={() => (restSec = Math.min(60, restSec + 5))}>+</button>
      </div>
      <p class="small muted">Locker bleiben: Jede Übung beenden, solange noch 3–4 Wiederholungen gingen. An Tagen mit Krafttraining entfällt die Abendroutine.</p>
    </div>
  {/if}

  <button class="ghost" onclick={reset}>Standard wiederherstellen</button>
  <button class="primary block save" onclick={save} disabled={items.length === 0}>Speichern</button>
</main>

<style>
  .list { list-style: none; padding: 0; margin: 8px 0 12px; }
  .list > li { border-bottom: 1px solid var(--line); padding: 10px 0; }
  .head { display: flex; align-items: center; gap: 8px; }
  .name { flex: 1; min-width: 0; text-align: left; background: none; border: 0; padding: 0; display: flex; flex-direction: column; color: var(--text); }
  .order { display: flex; gap: 4px; flex: none; }
  .order button { min-width: 40px; min-height: 40px; padding: 0; }
  .dur { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
  .dur button { min-width: 40px; min-height: 36px; padding: 0; font-size: 20px; }
  .dur span { min-width: 96px; text-align: center; font-variant-numeric: tabular-nums; }
  .lab { min-width: 64px; }
  .cues { padding-left: 20px; margin: 8px 0 0; }
  .addrow { display: flex; justify-content: space-between; align-items: center; width: 100%; text-align: left; margin: 6px 0; gap: 8px; }
  .plus { font-size: 22px; color: var(--accent); }
  .warn { color: var(--warn); }
  .save { min-height: 56px; margin-top: 16px; }
</style>
