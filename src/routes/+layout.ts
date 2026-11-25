// The journal lives client-side (localStorage + outbox synced to D1), so the
// app runs as an SPA; the Worker only serves the shell and the /api endpoints.
export const ssr = false;
