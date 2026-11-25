import { applyOp, type Journal, type Op } from './ops.ts';
import { childrenOf, descendantIds, indexButtons } from './tree.ts';
import type { ButtonColor, ResetCycle, Settings, TapButton, TapRecord } from './types.ts';

const CACHE_KEY = 'tapjournal:data';
const OUTBOX_KEY = 'tapjournal:outbox';
const SETTINGS_KEY = 'tapjournal:settings';

export interface SaveButtonInput {
	id?: string;
	name: string;
	color: ButtonColor;
	resetCycle: ResetCycle;
	parentId: string | null;
	/** Full desired list of direct subcategories; existing ones not listed are deleted. */
	children?: { id?: string; name: string }[];
}

function readJson<T>(key: string, fallback: T): T {
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

const newId = () => crypto.randomUUID();

/**
 * Client-side journal. All changes apply locally first (so taps are instant and
 * work offline), are cached in localStorage, and are queued in an outbox that is
 * flushed to the server in order.
 */
class JournalStore {
	buttons = $state<TapButton[]>([]);
	records = $state<TapRecord[]>([]);
	settings = $state<Settings>({ weekStartsOn: 0 });
	outbox = $state<Op[]>([]);
	loaded = $state(false);
	online = $state(true);
	syncError = $state<string | null>(null);
	/** Deferred `beforeinstallprompt` event, used to offer "Install app". */
	installPrompt = $state<(Event & { prompt(): Promise<void> }) | null>(null);

	byId = $derived(indexButtons(this.buttons));

	#flushing = false;

	init() {
		const cached = readJson<Journal>(CACHE_KEY, { buttons: [], records: [] });
		this.buttons = cached.buttons;
		this.records = cached.records;
		this.outbox = readJson<Op[]>(OUTBOX_KEY, []);
		this.settings = { ...this.settings, ...readJson<Partial<Settings>>(SETTINGS_KEY, {}) };
		this.loaded = true;

		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.installPrompt = e as Event & { prompt(): Promise<void> };
		});

		const sync = () => void this.sync();
		window.addEventListener('online', sync);
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') sync();
		});
		setInterval(sync, 60_000);
		sync();
	}

	#persist() {
		localStorage.setItem(CACHE_KEY, JSON.stringify({ buttons: this.buttons, records: this.records }));
		localStorage.setItem(OUTBOX_KEY, JSON.stringify(this.outbox));
	}

	#dispatch(...ops: Op[]) {
		let data: Journal = { buttons: this.buttons, records: this.records };
		for (const op of ops) data = applyOp(data, op);
		this.buttons = data.buttons;
		this.records = data.records;
		this.outbox = [...this.outbox, ...ops];
		this.#persist();
		void this.sync();
	}

	/** Sends queued ops, then pulls the server's copy if nothing is pending. */
	async sync() {
		if (this.#flushing) return;
		this.#flushing = true;
		try {
			while (this.outbox.length) {
				const op = $state.snapshot(this.outbox[0]);
				const res = await fetch('/api/ops', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(op)
				});
				// Any HTTP response means the server has seen the op; only network
				// failures (thrown above) keep it queued. Rejected ops are dropped and
				// the refresh below reconciles local state with the server.
				if (!res.ok) this.syncError = `Server rejected a change (${res.status})`;
				this.outbox = this.outbox.slice(1);
				this.#persist();
			}
			const res = await fetch('/api/data');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as Journal;
			this.online = true;
			if (!this.outbox.length) {
				this.buttons = data.buttons;
				this.records = data.records;
				this.#persist();
			}
		} catch {
			this.online = false;
		} finally {
			this.#flushing = false;
		}
		// Ops queued while the refresh was in flight still need sending.
		if (this.online && this.outbox.length) void this.sync();
	}

	// --- records ---

	tap(buttonId: string) {
		this.addRecord(buttonId, Date.now());
	}

	addRecord(buttonId: string, timestamp: number) {
		this.#dispatch({ type: 'upsertRecords', records: [{ id: newId(), buttonId, timestamp }] });
	}

	deleteRecords(ids: string[]) {
		if (ids.length) this.#dispatch({ type: 'deleteRecords', ids });
	}

	clearRecords() {
		this.#dispatch({ type: 'clearRecords' });
	}

	replaceAll(data: Journal) {
		this.#dispatch({ type: 'replaceAll', ...data });
	}

	// --- buttons ---

	saveButton(input: SaveButtonInput): string {
		const existing = input.id ? this.byId.get(input.id) : undefined;
		const id = existing?.id ?? newId();
		const now = Date.now();
		const siblings = childrenOf(this.buttons, input.parentId);
		const button: TapButton = {
			id,
			name: input.name,
			color: input.color,
			resetCycle: input.resetCycle,
			parentId: input.parentId,
			order: existing?.order ?? Math.max(-1, ...siblings.map((b) => b.order)) + 1,
			createdAt: existing?.createdAt ?? now
		};

		const ops: Op[] = [];
		const upserts: TapButton[] = [button];
		if (input.children) {
			const current = childrenOf(this.buttons, id);
			const keep = new Set(input.children.map((c) => c.id).filter(Boolean));
			const removed = current
				.filter((c) => !keep.has(c.id))
				.flatMap((c) => [...descendantIds(this.buttons, c.id)]);
			if (removed.length) ops.push({ type: 'deleteButtons', ids: removed });

			input.children.forEach((c, order) => {
				const prev = c.id ? this.byId.get(c.id) : undefined;
				upserts.push({
					id: prev?.id ?? newId(),
					name: c.name,
					// Subcategories that matched the parent's colour keep following it.
					color: !prev || prev.color === existing?.color ? input.color : prev.color,
					resetCycle: prev?.resetCycle ?? input.resetCycle,
					parentId: id,
					order,
					createdAt: prev?.createdAt ?? now
				});
			});
		}
		ops.push({ type: 'upsertButtons', buttons: upserts });
		this.#dispatch(...ops);
		return id;
	}

	deleteButton(id: string) {
		this.#dispatch({ type: 'deleteButtons', ids: [...descendantIds(this.buttons, id)] });
	}

	moveButton(id: string, delta: -1 | 1) {
		const b = this.byId.get(id);
		if (!b) return;
		const siblings = childrenOf(this.buttons, b.parentId);
		const from = siblings.findIndex((s) => s.id === id);
		const to = from + delta;
		if (to < 0 || to >= siblings.length) return;
		[siblings[from], siblings[to]] = [siblings[to], siblings[from]];
		const changed = siblings
			.map((s, order) => ({ ...s, order }))
			.filter((s) => this.byId.get(s.id)?.order !== s.order);
		this.#dispatch({ type: 'upsertButtons', buttons: changed });
	}

	// --- settings (per device) ---

	updateSettings(patch: Partial<Settings>) {
		this.settings = { ...this.settings, ...patch };
		localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
	}
}

export const store = new JournalStore();
