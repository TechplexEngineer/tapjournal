<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		open,
		title,
		subtitle,
		onclose,
		children
	}: {
		open: boolean;
		title: string;
		subtitle?: string;
		onclose: () => void;
		children: Snippet;
	} = $props();
</script>

<svelte:window onkeydown={(e) => open && e.key === 'Escape' && onclose()} />

{#if open}
	<div class="offcanvas-backdrop fade show" role="presentation" onclick={onclose}></div>
	<div class="offcanvas offcanvas-bottom show sheet" role="dialog" aria-modal="true" aria-label={title}>
		<div class="offcanvas-header pt-4 pb-2 px-4">
			<div class="flex-grow-1 text-center ps-4">
				<h5 class="offcanvas-title fw-bold">{title}</h5>
				{#if subtitle}<div class="small text-secondary">{subtitle}</div>{/if}
			</div>
			<button type="button" class="btn-close" aria-label="Close" onclick={onclose}></button>
		</div>
		<div class="offcanvas-body px-4 pb-4">
			{@render children()}
		</div>
	</div>
{/if}
