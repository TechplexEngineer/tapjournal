<script lang="ts">
	import { dayKey } from '#lib/date.ts';
	import { parseJournal } from '#lib/ops.ts';
	import { store } from '#lib/store.svelte.ts';

	let fileInput: HTMLInputElement;

	function exportData() {
		const payload = {
			app: 'tapjournal',
			exportedAt: new Date().toISOString(),
			buttons: $state.snapshot(store.buttons),
			records: $state.snapshot(store.records)
		};
		const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: `tapjournal-${dayKey(Date.now())}.json` });
		a.click();
		URL.revokeObjectURL(url);
	}

	async function importData(file: File | undefined) {
		if (!file) return;
		let data;
		try {
			data = parseJournal(JSON.parse(await file.text()));
		} catch {
			data = null;
		}
		fileInput.value = '';
		if (!data) return alert('That file is not a valid Tap Journal export.');
		const msg = `Replace everything with ${data.buttons.length} buttons and ${data.records.length} records from this file?`;
		if (confirm(msg)) store.replaceAll(data);
	}
</script>

<h1 class="page-title mb-4">Settings</h1>

<h2 class="h6 text-secondary text-uppercase small fw-bold">Sync</h2>
<div class="list-group mb-4 rounded-4">
	<div class="list-group-item d-flex align-items-center gap-2">
		<i class="bi {store.online ? 'bi-cloud-check text-success' : 'bi-cloud-slash text-warning'} fs-5"></i>
		<span class="flex-grow-1">
			{store.online ? 'Connected' : 'Offline — changes are saved on this device'}
			{#if store.outbox.length}<span class="d-block small text-secondary">{store.outbox.length} change(s) waiting to sync</span>{/if}
			{#if store.syncError}<span class="d-block small text-danger">{store.syncError}</span>{/if}
		</span>
		<button class="btn btn-sm btn-outline-secondary rounded-pill text-nowrap" onclick={() => store.sync()}>Sync now</button>
	</div>
	<div class="list-group-item text-secondary small">
		{store.buttons.length} buttons · {store.records.length} records
	</div>
</div>

<h2 class="h6 text-secondary text-uppercase small fw-bold">Preferences</h2>
<div class="list-group mb-4 rounded-4">
	<div class="list-group-item d-flex align-items-center">
		<span class="flex-grow-1">Week starts on</span>
		<div class="btn-group btn-group-sm" role="group">
			<button class="btn {store.settings.weekStartsOn === 0 ? 'btn-dark' : 'btn-outline-secondary'}" onclick={() => store.updateSettings({ weekStartsOn: 0 })}>Sunday</button>
			<button class="btn {store.settings.weekStartsOn === 1 ? 'btn-dark' : 'btn-outline-secondary'}" onclick={() => store.updateSettings({ weekStartsOn: 1 })}>Monday</button>
		</div>
	</div>
	{#if store.installPrompt}
		<button class="list-group-item list-group-item-action" onclick={() => store.installPrompt?.prompt()}>
			<i class="bi bi-phone me-2"></i> Install app on this device
		</button>
	{/if}
</div>

<h2 class="h6 text-secondary text-uppercase small fw-bold">Data</h2>
<div class="list-group mb-4 rounded-4">
	<button class="list-group-item list-group-item-action" onclick={exportData}>
		<i class="bi bi-download me-2"></i> Export to JSON
	</button>
	<button class="list-group-item list-group-item-action" onclick={() => fileInput.click()}>
		<i class="bi bi-upload me-2"></i> Import from JSON…
	</button>
	<input bind:this={fileInput} type="file" accept="application/json,.json" hidden onchange={(e) => importData(e.currentTarget.files?.[0])} />
	<button
		class="list-group-item list-group-item-action text-danger"
		onclick={() => confirm('Delete all records? Your buttons are kept.') && store.clearRecords()}
	>
		<i class="bi bi-eraser me-2"></i> Delete all records
	</button>
	<button
		class="list-group-item list-group-item-action text-danger"
		onclick={() => confirm('Delete all buttons and records? This cannot be undone.') && store.replaceAll({ buttons: [], records: [] })}
	>
		<i class="bi bi-trash3 me-2"></i> Reset everything
	</button>
</div>

<p class="text-center text-secondary small">Tap Journal</p>
