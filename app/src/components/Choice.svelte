<script lang="ts" generics="T extends string | number">
  // Einfach- oder Mehrfachauswahl als große Tipp-Flächen.
  interface Props {
    options: { value: T; label: string }[];
    value?: T;
    values?: T[];
    multi?: boolean;
    columns?: number;
    onchange?: () => void;
  }
  let { options, value = $bindable(), values = $bindable([]), multi = false, columns = 2, onchange }: Props = $props();

  function pick(v: T) {
    if (multi) {
      values = values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
    } else {
      value = v;
    }
    onchange?.();
  }
  const selected = (v: T) => (multi ? values.includes(v) : value === v);
</script>

<div class="choice" style="grid-template-columns: repeat({columns}, minmax(0, 1fr))" role={multi ? 'group' : 'radiogroup'}>
  {#each options as o (o.value)}
    <button
      type="button"
      class:on={selected(o.value)}
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={selected(o.value)}
      onclick={() => pick(o.value)}
    >{o.label}</button>
  {/each}
</div>

<style>
  .choice { display: grid; gap: 8px; }
  button {
    background: var(--surface);
    border: 1.5px solid var(--line);
    font-weight: 500;
    text-align: left;
    padding: 11px 14px;
    line-height: 1.25;
  }
  button.on {
    border-color: var(--accent);
    background: var(--accent-soft);
    font-weight: 650;
  }
</style>
