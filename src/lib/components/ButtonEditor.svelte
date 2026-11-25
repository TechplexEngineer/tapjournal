<script lang="ts">
	import { untrack } from 'svelte';
	import Sheet from './Sheet.svelte';
	import { store } from '../store.svelte.ts';
	import { childrenOf, descendantIds, labelOf } from '../tree.ts';
	import { COLOR_KEYS, CYCLES, isCustomColor, NAME_MAX, PALETTE, shades, textOn } from '../theme.ts';
	import type { ButtonColor, ResetCycle, TapButton } from '../types.ts';

	let {
		open,
		button,
		parentId,
		onclose
	}: {
		open: boolean;
		/** Button being edited, or null to create a new one under `parentId`. */
		button: TapButton | null;
		parentId: string | null;
		onclose: () => void;
	} = $props();

	const SUGGESTIONS = ['Coffee', 'Water', 'Meal', 'Snack', 'Medicine', 'Workout', 'Sleep', 'Bathroom'];

	let name = $state('');
	let color = $state<ButtonColor>('blue');
	/** Last custom colour picked, kept while trying presets. */
	let customColor = $state('#7c3aed');
	const custom = $derived(isCustomColor(color));
	let cycle = $state<ResetCycle>('daily');
	let subs = $state<{ key: string; id?: string; name: string }[]>([]);
	let newSub = $state('');

	const effectiveParentId = $derived(button ? button.parentId : parentId);
	const parentLabel = $derived(effectiveParentId ? labelOf(store.byId, effectiveParentId) : undefined);

	// Reset the form each time the sheet opens.
	$effect(() => {
		if (!open) return;
		untrack(() => {
			const parent = effectiveParentId ? store.byId.get(effectiveParentId) : undefined;
			name = button?.name ?? '';
			color = button?.color ?? parent?.color ?? 'blue';
			if (isCustomColor(color)) customColor = color;
			cycle = button?.resetCycle ?? parent?.resetCycle ?? 'daily';
			subs = button
				? childrenOf(store.buttons, button.id).map((c) => ({ key: c.id, id: c.id, name: c.name }))
				: [];
			newSub = '';
		});
	});

	function addSub() {
		const n = newSub.trim().slice(0, NAME_MAX);
		if (!n) return;
		subs.push({ key: crypto.randomUUID(), name: n });
		newSub = '';
	}

	function save() {
		const n = name.trim();
		if (!n) return;
		addSub(); // keep a typed-but-not-added subcategory

		const kept = subs.map((s) => ({ ...s, name: s.name.trim() })).filter((s) => s.name);
		const removed = button
			? childrenOf(store.buttons, button.id).filter((c) => !kept.some((s) => s.id === c.id))
			: [];
		if (removed.length) {
			const ids = new Set(removed.flatMap((c) => [...descendantIds(store.buttons, c.id)]));
			const count = store.records.filter((r) => ids.has(r.buttonId)).length;
			const names = removed.map((c) => `"${c.name}"`).join(', ');
			const msg = `Remove ${names}?` + (count ? ` This permanently deletes ${count} record${count === 1 ? '' : 's'}.` : '');
			if (!confirm(msg)) return;
		}

		store.saveButton({
			id: button?.id,
			name: n,
			color,
			resetCycle: cycle,
			parentId: effectiveParentId,
			children: kept.map((s) => ({ id: s.id, name: s.name }))
		});
		onclose();
	}
</script>

<Sheet
	{open}
	{onclose}
	title={button ? 'Edit Button' : effectiveParentId ? 'New Subcategory' : 'New Button'}
	subtitle={parentLabel ? `in ${parentLabel}` : undefined}
>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			save();
		}}
	>
		<div class="d-flex justify-content-between align-items-end mb-2">
			<label for="btn-name" class="form-label fw-semibold mb-0">Button Name</label>
			<small class="text-secondary">{name.length}/{NAME_MAX}</small>
		</div>
		<input
			id="btn-name"
			class="form-control form-control-lg rounded-pill"
			placeholder="e.g., Workout, New toothbrush…"
			maxlength={NAME_MAX}
			autocomplete="off"
			bind:value={name}
		/>
		{#if !button && !effectiveParentId}
			<div class="d-flex gap-2 overflow-auto mt-2 pb-1">
				{#each SUGGESTIONS as s (s)}
					<button type="button" class="chip" onclick={() => (name = s)}>{s}</button>
				{/each}
			</div>
		{/if}

		<div class="fw-semibold mt-4 mb-2">Select Color</div>
		<div class="d-flex flex-wrap gap-2">
			{#each COLOR_KEYS as key (key)}
				<button
					type="button"
					class="swatch"
					style:background={PALETTE[key].base}
					aria-label={key}
					aria-pressed={color === key}
					onclick={() => (color = key)}
				>
					{#if color === key}<i class="bi bi-check-lg"></i>{/if}
				</button>
			{/each}
			<!-- Custom colour: the transparent native picker sits on top of the swatch. -->
			<div
				class="swatch swatch-custom"
				class:picked={custom}
				style:background={custom ? color : undefined}
				style:color={custom ? textOn(color) : undefined}
			>
				<i class="bi {custom ? 'bi-check-lg' : 'bi-eyedropper'}"></i>
				<input
					type="color"
					aria-label="Custom color"
					value={customColor}
					onclick={() => (color = customColor as ButtonColor)}
					oninput={(e) => (customColor = color = e.currentTarget.value as ButtonColor)}
				/>
			</div>
		</div>

		<div class="fw-semibold mt-4 mb-2">Count Reset Cycle</div>
		<div class="segmented">
			{#each CYCLES as c (c.key)}
				<button type="button" class:active={cycle === c.key} onclick={() => (cycle = c.key)}>{c.label}</button>
			{/each}
		</div>

		<div class="fw-semibold mt-4">Subcategories</div>
		<div class="small text-secondary mb-2">
			Optional. A button with subcategories opens them when tapped, and you log one of them —
			e.g. <em>New toothbrush</em> → <em>At home</em> / <em>Travel bag</em>.
		</div>
		{#each subs as sub, i (sub.key)}
			<div class="input-group mb-2">
				<span class="input-group-text bg-white"><span class="color-dot" style:background={shades(color).base}></span></span>
				<input class="form-control" maxlength={NAME_MAX} bind:value={sub.name} aria-label="Subcategory name" />
				<button type="button" class="btn btn-outline-danger" aria-label="Remove {sub.name}" onclick={() => subs.splice(i, 1)}>
					<i class="bi bi-x-lg"></i>
				</button>
			</div>
		{/each}
		<div class="input-group">
			<input
				class="form-control"
				placeholder="Add a subcategory…"
				maxlength={NAME_MAX}
				bind:value={newSub}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						addSub();
					}
				}}
			/>
			<button type="button" class="btn btn-outline-secondary" disabled={!newSub.trim()} onclick={addSub}>
				<i class="bi bi-plus-lg"></i> Add
			</button>
		</div>

		<button type="submit" class="btn btn-dark btn-lg w-100 rounded-4 mt-4" disabled={!name.trim()}>Save</button>
	</form>
</Sheet>
