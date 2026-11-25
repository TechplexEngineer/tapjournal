# Tap Journal

A one-tap life logger (inspired by the Android app Tap Diary) with **optional hierarchy**: any button can have
user-configured subcategories. Tap _Bathroom_ to log it immediately, or tap _New toothbrush_ to choose
_At home_ / _Travel bag_. Stats for a group roll up all of its subcategories, with a per-subcategory breakdown.

Built as an installable, offline-capable **PWA** with **SvelteKit 3**, **Bootstrap 5**, running on
**Cloudflare Workers** with **D1**.

## How it works

- `src/lib/store.svelte.ts` — client store. Every change is an _op_ (`src/lib/ops.ts`) applied locally first,
  cached in `localStorage`, and queued in an outbox that is POSTed to `/api/ops` in order. Taps are instant and
  work offline; the queue flushes when the connection returns.
- `src/routes/api/` — `GET /api/data` returns the whole journal; `POST /api/ops` applies one op to D1 in a
  single transaction (`src/lib/server/db.ts`). Ops are idempotent (client-generated UUIDs + upserts).
- `src/service-worker/` — caches the app shell and build assets so the app opens without a network.
- `migrations/` — D1 schema. Buttons form a tree via `parent_id`; records reference the button tapped.
- Date maths (streaks, reset cycles, week start) runs on the client so it uses the device's time zone.

## Develop

```sh
npm install
npm run db:migrate:local   # create the local D1 database (.wrangler/state)
npm run dev                # Vite dev server; D1 is emulated locally
```

`npm run check` type-checks; `npm run build && npm run preview` runs the production Worker locally.

## Deploy

```sh
npx wrangler login
npx wrangler d1 create tapjournal       # copy the database_id into wrangler.jsonc
npm run db:migrate:remote
npm run deploy
```

**There is no built-in login.** Anyone with the URL can read and write the journal, so put it behind
[Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/)
(free for personal use) before using it with real data.
