import { self } from '$app/service-worker';
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';

const CACHE = `cache-${version}`;
// Manifest paths are relative to the app's base path, i.e. the worker's scope.
const toPathname = (path: string) => new URL(path, self.registration.scope).pathname;
const SHELL = toPathname('');
const ASSETS = [...immutable, ...assets].map((a) => toPathname(a.path)).concat(SHELL);

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(ASSETS))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	const url = new URL(request.url);
	// API calls go straight to the network; the app handles offline itself.
	if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			if (ASSETS.includes(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}
			try {
				return await fetch(request);
			} catch (err) {
				// Offline: every page is the same SPA shell.
				const fallback = (await cache.match(request)) ?? (request.mode === 'navigate' ? await cache.match(SHELL) : undefined);
				if (fallback) return fallback;
				throw err;
			}
		})()
	);
});
