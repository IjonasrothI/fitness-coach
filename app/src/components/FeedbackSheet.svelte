<script lang="ts">
  import { FEEDBACK_LABELS } from '../lib/strength';
  import type { FeedbackReason } from '../lib/types';

  interface Props { exerciseName: string; onsubmit: (r: FeedbackReason, note: string) => void; oncancel: () => void }
  let { exerciseName, onsubmit, oncancel }: Props = $props();
  let reason = $state<FeedbackReason | null>(null);
  let note = $state('');
  const reasons = Object.keys(FEEDBACK_LABELS) as FeedbackReason[];
</script>

<div class="backdrop" role="presentation" onclick={oncancel}></div>
<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="fb-title">
  <h2 id="fb-title">Klappt nicht?</h2>
  <p class="small muted">{exerciseName}</p>
  <div class="reasons">
    {#each reasons as r (r)}
      <button class:on={reason === r} onclick={() => (reason = r)}>{FEEDBACK_LABELS[r]}</button>
    {/each}
  </div>
  {#if reason === 'pain'}
    <p class="small warn-text">Bei Schmerz über 5/10, Schwellung oder stechendem Schmerz: Übung heute nicht weitermachen. Hält es an, ärztlich oder physiotherapeutisch abklären.</p>
  {/if}
  <label class="field"><span>Was genau? (optional, hilft beim Verbessern)</span>
    <input type="text" bind:value={note} placeholder="z. B. Band rutscht vom Pfosten" />
  </label>
  <div class="row">
    <button onclick={oncancel}>Abbrechen</button>
    <button class="primary" disabled={!reason} onclick={() => reason && onsubmit(reason, note)}>Übung tauschen</button>
  </div>
</div>

<style>
  .backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); z-index: 10; }
  .sheet {
    position: fixed; left: 0; right: 0; bottom: 0; z-index: 11; background: var(--surface);
    border-radius: 20px 20px 0 0; padding: 20px 16px calc(16px + env(safe-area-inset-bottom));
    max-height: 90dvh; overflow-y: auto; max-width: 560px; margin: 0 auto;
  }
  h2 { margin-top: 0; }
  .reasons { display: grid; gap: 8px; margin: 12px 0; }
  .reasons button { text-align: left; font-weight: 500; border: 1.5px solid var(--line); background: var(--surface); }
  .reasons button.on { border-color: var(--accent); background: var(--accent-soft); font-weight: 650; }
  .warn-text { color: var(--warn); }
</style>
