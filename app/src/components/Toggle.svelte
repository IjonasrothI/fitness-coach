<script lang="ts">
  interface Props { checked: boolean; label: string; hint?: string }
  let { checked = $bindable(), label, hint }: Props = $props();
</script>

<label class="toggle">
  <span class="text">
    <span>{label}</span>
    {#if hint}<span class="hint">{hint}</span>{/if}
  </span>
  <input type="checkbox" role="switch" bind:checked />
  <span class="track" aria-hidden="true"></span>
</label>

<style>
  .toggle {
    display: flex; align-items: center; gap: 12px; padding: 12px 0;
    border-bottom: 1px solid var(--line); cursor: pointer;
  }
  .text { flex: 1; display: flex; flex-direction: column; }
  .hint { font-size: 14px; color: var(--muted); }
  input { position: absolute; opacity: 0; pointer-events: none; }
  .track {
    width: 50px; height: 30px; border-radius: 15px; background: var(--surface-2);
    position: relative; flex: none; transition: background 0.15s;
    border: 1px solid var(--line);
  }
  .track::after {
    content: ''; position: absolute; top: 2px; left: 2px; width: 24px; height: 24px;
    border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: transform 0.15s;
  }
  input:checked + .track { background: var(--accent); border-color: var(--accent); }
  input:checked + .track::after { transform: translateX(20px); }
  input:focus-visible + .track { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
