<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ButtonEditor from '#lib/components/ButtonEditor.svelte';
	import { cycleStart, formatHeaderDate, formatTime, relativeShort, startOfDay } from '#lib/date.ts';
	import { useNow } from '#lib/now.svelte.ts';
	import { store } from '#lib/store.svelte.ts';
	import { gradient, PALETTE } from '#lib/theme.ts';
	import { childrenOf, descendantIds, labelOf, pathOf } from '#lib/tree.ts';
	import type { TapButton } from '#lib/types.ts';

	const now = useNow();

	let editing = $state(false);
	let editor = $state<{ open: boolean; button: TapButton | null }>({ open: false, button: null });
	let tappedId = $state<string | null>(null);

	// Drilling into groups uses shallow routing, so the device back button pops back out.
	const groupPath = $derived((page.state.groupPath ?? []).filter((id) => store.byId.has(id)));
	const parentId = $derived(groupPath.at(-1) ?? null);
	const parent = $derived(parentId ? store.byId.get(parentId) : undefined);
	const items = $derived(childrenOf(store.buttons, parentId));

	const timesByButton = $derived.by(() => {
		const map = new Map<string, number[]>();
		for (const r of store.records) {
			const list = map.get(r.buttonId);
			if (list) list.push(r.timestamp);
			else map.set(r.buttonId, [r.timestamp]);
		}
		return map;
	});

	/** Count within the button's reset cycle, and last tap, aggregated over subcategories. */
	function summary(b: TapButton) {
		const start = cycleStart(b.resetCycle, now.current, store.settings.weekStartsOn);
		let count = 0;
		let last = 0;
		for (const id of descendantIds(store.buttons, b.id)) {
			for (const t of timesByButton.get(id) ?? []) {
				if (t >= start) count++;
				if (t > last) last = t;
			}
		}
		return { count, last };
	}

	const todayCount = $derived(store.records.filter((r) => r.timestamp >= startOfDay(now.current)).length);
	const lastRecord = $derived(
		store.records.reduce<(typeof store.records)[number] | undefined>(
			(best, r) => (!best || r.timestamp > best.timestamp ? r : best),
			undefined
		)
	);

	function enterGroup(b: TapButton) {
		goto('/', { shallow: true, state: { groupPath: [...groupPath, b.id] } });
	}

	function press(b: TapButton) {
		const hasChildren = store.buttons.some((c) => c.parentId === b.id);
		if (hasChildren) return enterGroup(b);
		if (editing) return openEditor(b);

		store.tap(b.id);
		navigator.vibrate?.(15);
		tappedId = b.id;
		setTimeout(() => tappedId === b.id && (tappedId = null), 450);
		// Logged a subcategory: return to the top level, ready for the next tap.
		if (groupPath.length) setTimeout(() => history.go(-groupPath.length), 250);
	}

	function openEditor(button: TapButton | null) {
		editor = { open: true, button };
	}

	function remove(b: TapButton) {
		const ids = descendantIds(store.buttons, b.id);
		const records = store.records.filter((r) => ids.has(r.buttonId)).length;
		const subs = ids.size - 1;
		const details = [
			subs && `${subs} subcategor${subs === 1 ? 'y' : 'ies'}`,
			records && `${records} record${records === 1 ? '' : 's'}`
		].filter(Boolean);
		const msg = `Delete "${b.name}"?` + (details.length ? ` This also deletes ${details.join(' and ')}.` : '');
		if (confirm(msg)) store.deleteButton(b.id);
	}
</script>

<header class="d-flex align-items-center gap-2 mb-4">
	{#if parent}
		<button class="btn btn-link text-dark p-0 me-1 fs-3" aria-label="Back" onclick={() => history.back()}>
			<i class="bi bi-chevron-left"></i>
		</button>
		<div class="flex-grow-1 min-w-0">
			{#if groupPath.length > 1}
				<div class="small text-secondary text-truncate">{labelOf(store.byId, groupPath.at(-2)!)}</div>
			{/if}
			<h1 class="page-title text-truncate">{parent.name}</h1>
		</div>
	{:else}
		<h1 class="page-title">{editing ? 'Edit Buttons' : formatHeaderDate(now.current)}</h1>
		{#if !editing && todayCount}<span class="badge rounded-pill text-bg-light fs-6 border">{todayCount}</span>{/if}
		<div class="flex-grow-1"></div>
	{/if}
	<button class="btn-circle" aria-label={parent ? 'Add subcategory' : 'Add button'} onclick={() => openEditor(null)}>
		<i class="bi bi-plus-lg"></i>
	</button>
	<button
		class="btn-circle"
		class:active={editing}
		aria-label={editing ? 'Done editing' : 'Edit buttons'}
		onclick={() => (editing = !editing)}
	>
		<i class="bi {editing ? 'bi-check-lg' : 'bi-pencil'}"></i>
	</button>
</header>

{#if items.length}
	<div class="tap-grid">
		{#each items as b, i (b.id)}
			{@const s = summary(b)}
			{@const kids = childrenOf(store.buttons, b.id).length}
			<div
				class="tap-card"
				class:tapped={tappedId === b.id}
				style:background={gradient(b.color)}
				role="button"
				tabindex="0"
				onclick={() => press(b)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), press(b))}
			>
				<div class="d-flex justify-content-between align-items-start gap-1">
					{#if editing}
						<div class="d-flex gap-1">
							<button class="card-icon" aria-label="Move earlier" disabled={i === 0} onclick={(e) => (e.stopPropagation(), store.moveButton(b.id, -1))}>
								<i class="bi bi-arrow-left"></i>
							</button>
							<button class="card-icon" aria-label="Move later" disabled={i === items.length - 1} onclick={(e) => (e.stopPropagation(), store.moveButton(b.id, 1))}>
								<i class="bi bi-arrow-right"></i>
							</button>
						</div>
						<div class="d-flex gap-1">
							<button class="card-icon" aria-label="Edit {b.name}" onclick={(e) => (e.stopPropagation(), openEditor(b))}>
								<i class="bi bi-pencil"></i>
							</button>
							<button class="card-icon" aria-label="Delete {b.name}" onclick={(e) => (e.stopPropagation(), remove(b))}>
								<i class="bi bi-trash3"></i>
							</button>
						</div>
					{:else}
						<span class="tap-time">{s.last ? relativeShort(s.last, now.current) : ''}</span>
						{#if s.count}<span class="tap-count">{s.count}</span>{/if}
					{/if}
				</div>
				<div class="mt-3">
					<div class="tap-name">{b.name}</div>
					{#if kids}
						<div class="tap-sub mt-1">
							<i class="bi bi-diagram-3"></i>
							{kids} option{kids === 1 ? '' : 's'}
							<i class="bi bi-chevron-right"></i>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="text-center text-secondary py-5">
		<i class="bi bi-hand-index-thumb fs-1 d-block mb-2"></i>
		{#if parent}
			No subcategories yet. Tap <strong>+</strong> to add one.
		{:else}
			No buttons yet. Tap <strong>+</strong> to create your first one.
		{/if}
	</div>
{/if}

{#if !editing}
	<div class="last-pill">
		{#if lastRecord}
			{@const path = pathOf(store.byId, lastRecord.buttonId)}
			{@const b = path.at(-1)}
			<span class="color-dot" style:background={b ? PALETTE[b.color].base : '#ccc'}></span>
			<a href="/records" class="text-dark text-decoration-none text-truncate lh-sm">
				<span class="fw-semibold">{b?.name ?? 'Deleted button'}</span>
				{#if path.length > 1}<span class="d-block small text-secondary text-truncate">{path.slice(0, -1).map((p) => p.name).join(' › ')}</span>{/if}
			</a>
			<span class="text-secondary text-nowrap">{formatTime(lastRecord.timestamp)}</span>
			<button class="btn btn-sm btn-light rounded-pill ms-auto text-nowrap" onclick={() => store.deleteRecords([lastRecord.id])}>
				<i class="bi bi-arrow-counterclockwise"></i> Undo
			</button>
		{:else}
			<i class="bi bi-arrow-up text-secondary"></i>
			<span class="text-secondary">Tap a button to log the time</span>
		{/if}
	</div>
{/if}

<ButtonEditor
	open={editor.open}
	button={editor.button}
	{parentId}
	onclose={() => (editor = { open: false, button: null })}
/>
