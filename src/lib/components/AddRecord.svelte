<script lang="ts">
	import { untrack } from 'svelte';
	import Sheet from './Sheet.svelte';
	import { dayKey, startOfDay } from '../date.ts';
	import { store } from '../store.svelte.ts';
	import { flattenTree } from '../tree.ts';

	let { open, day, onclose }: { open: boolean; day: number; onclose: () => void } = $props();

	const options = $derived(
		flattenTree(store.buttons).map(({ button, depth }) => ({
			id: button.id,
			label: '    '.repeat(depth) + (depth ? '↳ ' : '') + button.name,
			isGroup: store.buttons.some((c) => c.parentId === button.id)
		}))
	);

	let buttonId = $state('');
	let date = $state('');
	let time = $state('');

	$effect(() => {
		if (!open) return;
		untrack(() => {
			const now = new Date();
			const isToday = startOfDay(day) === startOfDay(now.getTime());
			buttonId = options.find((o) => !o.isGroup)?.id ?? '';
			date = dayKey(day);
			time = isToday ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` : '12:00';
		});
	});

	const timestamp = $derived.by(() => {
		const [y, m, d] = date.split('-').map(Number);
		const [hh, mm] = time.split(':').map(Number);
		return new Date(y, m - 1, d, hh, mm).getTime();
	});
	const inFuture = $derived(timestamp > Date.now() + 60_000);
	const valid = $derived(!!buttonId && Number.isFinite(timestamp) && !inFuture);

	function save() {
		if (!valid) return;
		store.addRecord(buttonId, timestamp);
		onclose();
	}
</script>

<Sheet {open} {onclose} title="Add Record">
	{#if options.length}
		<label for="rec-button" class="form-label fw-semibold">Button</label>
		<select id="rec-button" class="form-select form-select-lg rounded-pill mb-3" bind:value={buttonId}>
			{#each options as o (o.id)}
				<option value={o.id}>{o.label}</option>
			{/each}
		</select>
		<div class="row g-2">
			<div class="col-7">
				<label for="rec-date" class="form-label fw-semibold">Date</label>
				<input id="rec-date" type="date" class="form-control form-control-lg" max={dayKey(Date.now())} bind:value={date} />
			</div>
			<div class="col-5">
				<label for="rec-time" class="form-label fw-semibold">Time</label>
				<input id="rec-time" type="time" class="form-control form-control-lg" bind:value={time} />
			</div>
		</div>
		{#if inFuture}<div class="text-danger small mt-2">Records can't be in the future.</div>{/if}
		<button class="btn btn-dark btn-lg w-100 rounded-4 mt-4" disabled={!valid} onclick={save}>Save</button>
	{:else}
		<p class="text-secondary text-center my-4">Create a button on the Home tab first.</p>
	{/if}
</Sheet>
