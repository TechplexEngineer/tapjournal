import { COLOR_KEYS, CYCLES, NAME_MAX } from './theme.ts';
import type { TapButton, TapRecord } from './types.ts';

/**
 * Every change to the journal is expressed as an op. The client applies ops
 * optimistically to its local copy and queues them for the server, which
 * applies the same op to D1. Ops are idempotent so they can be safely retried.
 */
export type Op =
	| { type: 'upsertButtons'; buttons: TapButton[] } // parents must precede children
	| { type: 'deleteButtons'; ids: string[] } // must include all descendants
	| { type: 'upsertRecords'; records: TapRecord[] }
	| { type: 'deleteRecords'; ids: string[] }
	| { type: 'clearRecords' }
	| { type: 'replaceAll'; buttons: TapButton[]; records: TapRecord[] };

export interface Journal {
	buttons: TapButton[];
	records: TapRecord[];
}

export function applyOp(data: Journal, op: Op): Journal {
	switch (op.type) {
		case 'upsertButtons': {
			const incoming = new Map(op.buttons.map((b) => [b.id, b]));
			const kept = data.buttons.map((b) => incoming.get(b.id) ?? b);
			const existing = new Set(data.buttons.map((b) => b.id));
			return { ...data, buttons: [...kept, ...op.buttons.filter((b) => !existing.has(b.id))] };
		}
		case 'deleteButtons': {
			const ids = new Set(op.ids);
			return {
				buttons: data.buttons.filter((b) => !ids.has(b.id)),
				records: data.records.filter((r) => !ids.has(r.buttonId))
			};
		}
		case 'upsertRecords': {
			const known = new Set(data.buttons.map((b) => b.id));
			const incoming = new Map(op.records.filter((r) => known.has(r.buttonId)).map((r) => [r.id, r]));
			const kept = data.records.map((r) => incoming.get(r.id) ?? r);
			const existing = new Set(data.records.map((r) => r.id));
			return { ...data, records: [...kept, ...[...incoming.values()].filter((r) => !existing.has(r.id))] };
		}
		case 'deleteRecords': {
			const ids = new Set(op.ids);
			return { ...data, records: data.records.filter((r) => !ids.has(r.id)) };
		}
		case 'clearRecords':
			return { ...data, records: [] };
		case 'replaceAll':
			return { buttons: op.buttons, records: op.records };
	}
}

// --- validation (used by the server for requests and by the client for imports) ---

const CYCLE_KEYS = CYCLES.map((c) => c.key) as string[];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseButton(v: unknown): TapButton | null {
	if (!isObj(v) || !isId(v.id) || typeof v.name !== 'string') return null;
	const name = v.name.trim().slice(0, NAME_MAX);
	if (!name) return null;
	if (v.parentId !== null && !isId(v.parentId)) return null;
	return {
		id: v.id,
		name,
		color: COLOR_KEYS.includes(v.color as never) ? (v.color as TapButton['color']) : 'blue',
		resetCycle: CYCLE_KEYS.includes(v.resetCycle as string) ? (v.resetCycle as TapButton['resetCycle']) : 'daily',
		parentId: v.parentId,
		order: isNum(v.order) ? Math.trunc(v.order) : 0,
		createdAt: isNum(v.createdAt) ? v.createdAt : Date.now()
	};
}

export function parseRecord(v: unknown): TapRecord | null {
	if (!isObj(v) || !isId(v.id) || !isId(v.buttonId) || !isNum(v.timestamp)) return null;
	return { id: v.id, buttonId: v.buttonId, timestamp: Math.trunc(v.timestamp) };
}

function parseList<T>(v: unknown, parse: (x: unknown) => T | null): T[] | null {
	if (!Array.isArray(v)) return null;
	const out: T[] = [];
	for (const x of v) {
		const parsed = parse(x);
		if (!parsed) return null;
		out.push(parsed);
	}
	return out;
}

const parseIds = (v: unknown) => parseList(v, (x) => (isId(x) ? x : null));

/** Orders buttons parents-first and drops any whose parent is missing (or cyclic). */
export function sortParentsFirst(buttons: TapButton[]): TapButton[] {
	const out: TapButton[] = [];
	const placed = new Set<string>();
	let pending = buttons;
	while (pending.length) {
		const ready = pending.filter((b) => b.parentId === null || placed.has(b.parentId));
		if (!ready.length) break;
		for (const b of ready) {
			out.push(b);
			placed.add(b.id);
		}
		pending = pending.filter((b) => !placed.has(b.id));
	}
	return out;
}

export function parseJournal(v: unknown): Journal | null {
	if (!isObj(v)) return null;
	const buttons = parseList(v.buttons, parseButton);
	const records = parseList(v.records, parseRecord);
	if (!buttons || !records) return null;
	const sorted = sortParentsFirst(buttons);
	const known = new Set(sorted.map((b) => b.id));
	return { buttons: sorted, records: records.filter((r) => known.has(r.buttonId)) };
}

export function parseOp(v: unknown): Op | null {
	if (!isObj(v)) return null;
	switch (v.type) {
		case 'upsertButtons': {
			const buttons = parseList(v.buttons, parseButton);
			return buttons && { type: v.type, buttons };
		}
		case 'deleteButtons':
		case 'deleteRecords': {
			const ids = parseIds(v.ids);
			return ids && { type: v.type, ids };
		}
		case 'upsertRecords': {
			const records = parseList(v.records, parseRecord);
			return records && { type: v.type, records };
		}
		case 'clearRecords':
			return { type: v.type };
		case 'replaceAll': {
			const journal = parseJournal(v);
			return journal && { type: v.type, ...journal };
		}
		default:
			return null;
	}
}
