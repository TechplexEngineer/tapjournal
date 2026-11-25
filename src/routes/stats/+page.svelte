<script lang="ts">
	import { formatDate, relativeDay, startOfDay, startOfMonth, startOfWeek, startOfYear } from '#lib/date.ts';
	import { computeStats } from '#lib/stats.ts';
	import { store } from '#lib/store.svelte.ts';
	import { shades } from '#lib/theme.ts';
	import { childrenOf, descendantIds, flattenTree, labelOf } from '#lib/tree.ts';

	type Period = 'all' | 'day' | 'week' | 'month' | 'year';
	const PERIODS: { key: Period; label: string }[] = [
		{ key: 'all', label: 'All' },
		{ key: 'day', label: 'Day' },
		{ key: 'week', label: 'Week' },
		{ key: 'month', label: 'Month' },
		{ key: 'year', label: 'Year' }
	];

	const now = Date.now();
	let selId = $state(''); // '' = all buttons
	let period = $state<Period>('all');

	const selected = $derived(selId ? store.byId.get(selId) : undefined);
	const periodStart = $derived(
		{
			all: -Infinity,
			day: startOfDay(now),
			week: startOfWeek(now, store.settings.weekStartsOn),
			month: startOfMonth(now),
			year: startOfYear(now)
		}[period]
	);
	const inPeriod = $derived(store.records.filter((r) => r.timestamp >= periodStart));
	const records = $derived.by(() => {
		if (!selected) return inPeriod;
		const ids = descendantIds(store.buttons, selected.id);
		return inPeriod.filter((r) => ids.has(r.buttonId));
	});
	const stats = $derived(computeStats(records));

	const hero = $derived(
		selected
			? `linear-gradient(135deg, ${shades(selected.color).dark}, ${shades(selected.color).light})`
			: 'linear-gradient(135deg, #C2410C, #FB923C)'
	);

	/** How the selection's records split across its direct subcategories. */
	const breakdown = $derived.by(() => {
		const kids = childrenOf(store.buttons, selected?.id ?? null);
		if (!kids.length) return [];
		const rows = kids.map((k) => {
			const ids = descendantIds(store.buttons, k.id);
			return { id: k.id, name: k.name, color: k.color, count: records.filter((r) => ids.has(r.buttonId)).length };
		});
		if (selected) {
			const direct = records.filter((r) => r.buttonId === selected.id).length;
			if (direct) rows.push({ id: selected.id, name: `${selected.name} (unspecified)`, color: selected.color, count: direct });
		}
		return rows.sort((a, b) => b.count - a.count);
	});

	let showHelp = $state(false);
</script>

<header class="mb-3">
	<h1 class="page-title text-truncate">{selected ? labelOf(store.byId, selected.id) : 'All Taps'}</h1>
</header>

<select class="form-select rounded-pill mb-3" bind:value={selId} aria-label="Button">
	<option value="">All taps</option>
	{#each flattenTree(store.buttons) as { button, depth } (button.id)}
		<option value={button.id}>{'    '.repeat(depth) + (depth ? '↳ ' : '') + button.name}</option>
	{/each}
</select>

<div class="segmented mb-3">
	{#each PERIODS as p (p.key)}
		<button class:active={period === p.key} onclick={() => (period = p.key)}>{p.label}</button>
	{/each}
</div>

<div class="rounded-5 p-4 text-white mb-3 shadow-sm" style:background={hero}>
	<div class="display-3 fw-bold lh-1">{stats?.total ?? 0}</div>
	<div class="fs-5 fw-semibold mt-1 mb-4">Total Records</div>
	{#if stats}
		<div class="position-relative mb-2" style="height: 14px">
			<div class="position-absolute top-50 start-0 end-0 border-top border-2 border-white opacity-50"></div>
			<div class="position-absolute top-0 start-0 bg-white rounded-circle" style="width:14px;height:14px"></div>
			<div class="position-absolute top-0 end-0 bg-white rounded-circle" style="width:14px;height:14px"></div>
		</div>
		<div class="d-flex justify-content-between">
			<div>
				<div class="small opacity-75">First Record</div>
				<div class="fs-5 fw-bold">{formatDate(stats.first)}</div>
				<div class="small opacity-75">{relativeDay(stats.first, now)}</div>
			</div>
			<div class="text-end">
				<div class="small opacity-75">Last Record</div>
				<div class="fs-5 fw-bold">{formatDate(stats.last)}</div>
				<div class="small opacity-75">{relativeDay(stats.last, now)}</div>
			</div>
		</div>
	{:else}
		<div class="opacity-75">No records in this period.</div>
	{/if}
</div>

{#if stats}
	<div class="row g-3 mb-3">
		<div class="col-6">
			<div class="surface p-3 h-100">
				<div class="d-flex justify-content-between align-items-center">
					<span class="fw-bold fs-5">Streak</span>
					<i class="bi bi-fire text-warning fs-4"></i>
				</div>
				<div class="display-5 fw-bold" style="color: var(--bs-orange)">{stats.longestStreak}</div>
				<div class="text-secondary small">{formatDate(stats.longestStreakStart)}</div>
			</div>
		</div>
		<div class="col-6">
			<div class="surface p-3 h-100">
				<div class="d-flex justify-content-between align-items-center">
					<span class="fw-bold fs-5">Best Day</span>
					<i class="bi bi-trophy-fill text-warning fs-4"></i>
				</div>
				<div class="display-5 fw-bold" style="color: var(--bs-orange)">{stats.bestDayCount}</div>
				<div class="text-secondary small">{formatDate(stats.bestDay)}</div>
			</div>
		</div>
	</div>

	{#if breakdown.length}
		<div class="surface p-3 mb-3">
			<div class="fw-bold fs-5 mb-3">Breakdown</div>
			{#each breakdown as row (row.id)}
				{@const pct = stats.total ? Math.round((row.count / stats.total) * 100) : 0}
				<button class="btn w-100 text-start p-0 border-0 mb-3" onclick={() => (selId = row.id)} disabled={row.id === selId}>
					<div class="d-flex justify-content-between mb-1">
						<span class="fw-semibold"><span class="color-dot me-2 align-middle" style:background={shades(row.color).base}></span>{row.name}</span>
						<span class="text-secondary">{row.count} · {pct}%</span>
					</div>
					<div class="progress" style="height: 8px" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
						<div class="progress-bar" style:width="{pct}%" style:background={shades(row.color).base}></div>
					</div>
				</button>
			{/each}
		</div>
	{/if}
{/if}

<div class="text-center">
	<button class="btn btn-link text-secondary text-decoration-none" onclick={() => (showHelp = !showHelp)}>
		<i class="bi bi-question-circle"></i> Statistics Help <i class="bi bi-chevron-{showHelp ? 'up' : 'right'}"></i>
	</button>
</div>
{#if showHelp}
	<div class="surface p-3 small text-secondary">
		<p><strong>Total Records</strong> counts taps in the selected period. Groups include all of their subcategories.</p>
		<p><strong>Streak</strong> is the longest run of consecutive days with at least one record, and the day it started.</p>
		<p><strong>Best Day</strong> is the day with the most records (the most recent one wins ties).</p>
		<p class="mb-0"><strong>Breakdown</strong> shows how a group's records split across its subcategories. Tap a row to drill in.</p>
	</div>
{/if}
