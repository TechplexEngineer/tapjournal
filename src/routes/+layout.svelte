<script lang="ts">
	import 'bootstrap/dist/css/bootstrap.min.css';
	import 'bootstrap-icons/font/bootstrap-icons.min.css';
	import '../app.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { store } from '#lib/store.svelte.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const tabs = [
		{ href: '/', icon: 'grid', label: 'Home' },
		{ href: '/records', icon: 'calendar-event', label: 'Records' },
		{ href: '/stats', icon: 'bar-chart', label: 'Stats' },
		{ href: '/settings', icon: 'gear', label: 'Settings' }
	] as const;

	onMount(() => store.init());
</script>

{#if store.loaded}
	<main class="app-main container-fluid">
		{@render children()}
	</main>
{/if}

<nav class="tabbar" aria-label="Main">
	{#each tabs as tab (tab.href)}
		{@const active = page.url.pathname === tab.href}
		<a href={tab.href} class="tabbar-item" class:active aria-current={active ? 'page' : undefined}>
			<i class="bi bi-{tab.icon}{active ? '-fill' : ''}"></i>
			<span>{tab.label}</span>
		</a>
	{/each}
</nav>
