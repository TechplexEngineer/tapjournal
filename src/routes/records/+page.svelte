<script lang="ts">
	import AddRecord from '#lib/components/AddRecord.svelte';
	import {
		addDays,
		dayKey,
		formatDate,
		formatMonthYear,
		formatTime,
		startOfDay,
		startOfWeek,
		WEEKDAYS_SHORT
	} from '#lib/date.ts';
	import { store } from '#lib/store.svelte.ts';
	import { shades } from '#lib/theme.ts';
	import { pathOf } from '#lib/tree.ts';
	import type { TapRecord } from '#lib/types.ts';

	const today = startOfDay(Date.now());

	let selected = $state(today);
	let newestFirst = $state(true);
	let searching = $state(false);
	let query = $state('');
	let adding = $state(false);

	const week = $derived.by(() => {
		const start = startOfWeek(selected, store.settings.weekStartsOn);
		return Array.from({ length: 7 }, (_, i) => addDays(start, i));
	});
	const daysWithRecords = $derived(new Set(store.records.map((r) => dayKey(r.timestamp))));

	const sortRecords = (list: TapRecord[]) =>
		list.toSorted((a, b) => (newestFirst ? b.timestamp - a.timestamp : a.timestamp - b.timestamp));

	const dayRecords = $derived(
		sortRecords(store.records.filter((r) => r.timestamp >= selected && r.timestamp < addDays(selected, 1)))
	);

	const searchResults = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return [];
		return sortRecords(
			store.records.filter((r) =>
				pathOf(store.byId, r.buttonId).some((b) => b.name.toLowerCase().includes(q))
			)
		);
	});

	function shiftWeek(delta: number) {
		selected = Math.min(today, addDays(selected, delta * 7));
	}

	function deleteDay() {
		if (confirm(`Delete all ${dayRecords.length} records on ${formatDate(selected)}?`)) {
			store.deleteRecords(dayRecords.map((r) => r.id));
		}
	}

	function deleteOne(r: TapRecord) {
		if (confirm(`Delete this record from ${formatTime(r.timestamp)}?`)) store.deleteRecords([r.id]);
	}
</script>

{#snippet recordRow(r: TapRecord, showDate: boolean)}
	{@const path = pathOf(store.byId, r.buttonId)}
	{@const leaf = path.at(-1)}
	<li class="list-group-item bg-transparent d-flex align-items-center gap-3 px-0 border-0">
		<span class="text-secondary text-nowrap" style="min-width: 4.5rem">
			{#if showDate}<span class="d-block small">{formatDate(r.timestamp)}</span>{/if}
			{formatTime(r.timestamp)}
		</span>
		<span class="color-dot" style:background={leaf ? shades(leaf.color).base : '#ccc'}></span>
		<span class="flex-grow-1 min-w-0">
			{#each path.slice(0, -1) as p (p.id)}<span class="text-secondary">{p.name} › </span>{/each}
			<span class="fw-semibold fs-5">{leaf?.name ?? 'Deleted button'}</span>
		</span>
		<button class="btn btn-sm btn-link text-secondary" aria-label="Delete record" onclick={() => deleteOne(r)}>
			<i class="bi bi-x-lg"></i>
		</button>
	</li>
{/snippet}

<header class="d-flex align-items-center gap-3 mb-3">
	{#if searching}
		<!-- svelte-ignore a11y_autofocus -->
		<input class="form-control form-control-lg rounded-pill" placeholder="Search records…" bind:value={query} autofocus />
		<button class="btn-circle flex-shrink-0" aria-label="Close search" onclick={() => ((searching = false), (query = ''))}>
			<i class="bi bi-x-lg"></i>
		</button>
	{:else}
		<button class="btn btn-link text-dark p-0" aria-label="Previous week" onclick={() => shiftWeek(-1)}>
			<i class="bi bi-caret-left-fill"></i>
		</button>
		<button class="btn btn-link text-dark fw-bold fs-4 p-0" title="Jump to today" onclick={() => (selected = today)}>
			{formatMonthYear(selected)}
		</button>
		<button class="btn btn-link text-dark p-0" aria-label="Next week" disabled={addDays(week[0], 7) > today} onclick={() => shiftWeek(1)}>
			<i class="bi bi-caret-right-fill"></i>
		</button>
		<div class="flex-grow-1"></div>
		<button class="btn-circle" aria-label="Search" onclick={() => (searching = true)}><i class="bi bi-search"></i></button>
	{/if}
</header>

{#if searching}
	<div class="surface p-3">
		{#if !query.trim()}
			<p class="text-secondary text-center my-3">Search by button or subcategory name.</p>
		{:else}
			<div class="text-secondary mb-2"><strong class="text-dark">{searchResults.length}</strong> matching records</div>
			<ul class="list-group">
				{#each searchResults as r (r.id)}{@render recordRow(r, true)}{/each}
			</ul>
		{/if}
	</div>
{:else}
	<div class="surface d-flex justify-content-between p-3 mb-3">
		{#each week as d (d)}
			{@const date = new Date(d)}
			{@const future = d > today}
			<button
				class="btn border-0 d-flex flex-column align-items-center px-1 py-2 rounded-pill"
				class:btn-dark={d === selected}
				disabled={future}
				onclick={() => (selected = d)}
			>
				<small
					class={d === selected
						? ''
						: future
							? 'text-body-tertiary'
							: date.getDay() === 0
								? 'text-danger'
								: date.getDay() === 6
									? 'text-primary'
									: 'text-secondary'}
				>
					{WEEKDAYS_SHORT[date.getDay()]}
				</small>
				<span
					class="fs-5 fw-semibold"
					class:text-danger={d !== selected && date.getDay() === 0 && !future}
					class:text-body-tertiary={future}
				>{date.getDate()}</span>
				<i class="bi bi-dot lh-1" style:visibility={daysWithRecords.has(dayKey(d)) ? 'visible' : 'hidden'}></i>
			</button>
		{/each}
	</div>

	<div class="surface p-3">
		<div class="d-flex align-items-center mb-3">
			<span class="text-secondary flex-grow-1">
				<strong class="text-dark">{dayRecords.length}</strong>
				record{dayRecords.length === 1 ? '' : 's'}
				{selected === today ? 'today' : `on ${formatDate(selected)}`}
			</span>
			<button class="btn btn-sm btn-link text-secondary text-decoration-none" onclick={() => (newestFirst = !newestFirst)}>
				<i class="bi bi-sort-{newestFirst ? 'down' : 'up'}"></i>
				{newestFirst ? 'Newest' : 'Oldest'}
			</button>
			<button class="btn btn-sm btn-link text-dark" aria-label="Delete all records this day" disabled={!dayRecords.length} onclick={deleteDay}>
				<i class="bi bi-trash3"></i>
			</button>
		</div>
		<button class="btn btn-outline-secondary rounded-pill mb-2" style="border-style: dashed" onclick={() => (adding = true)}>
			Add Record <i class="bi bi-plus-lg"></i>
		</button>
		<ul class="list-group">
			{#each dayRecords as r (r.id)}{@render recordRow(r, false)}{/each}
		</ul>
	</div>
{/if}

<AddRecord open={adding} day={selected} onclose={() => (adding = false)} />
