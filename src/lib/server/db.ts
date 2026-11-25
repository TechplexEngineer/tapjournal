import { env } from 'cloudflare:workers';
import type { Journal, Op } from '#lib/ops.ts';
import type { TapButton, TapRecord } from '#lib/types.ts';

interface ButtonRow {
	id: string;
	name: string;
	color: TapButton['color'];
	reset_cycle: TapButton['resetCycle'];
	parent_id: string | null;
	sort_order: number;
	created_at: number;
}

interface RecordRow {
	id: string;
	button_id: string;
	timestamp: number;
}

export async function loadJournal(): Promise<Journal> {
	const [buttons, records] = await env.DB.batch([
		env.DB.prepare('SELECT * FROM buttons'),
		env.DB.prepare('SELECT id, button_id, timestamp FROM records ORDER BY timestamp')
	]);
	return {
		buttons: (buttons.results as unknown as ButtonRow[]).map((r) => ({
			id: r.id,
			name: r.name,
			color: r.color,
			resetCycle: r.reset_cycle,
			parentId: r.parent_id,
			order: r.sort_order,
			createdAt: r.created_at
		})),
		records: (records.results as unknown as RecordRow[]).map((r) => ({
			id: r.id,
			buttonId: r.button_id,
			timestamp: r.timestamp
		}))
	};
}

// Upserts silently skip rows whose parent/button no longer exists (e.g. deleted
// from another device while this one was offline) instead of failing the batch.
const upsertButton = (b: TapButton) =>
	env.DB.prepare(
		`INSERT INTO buttons (id, name, color, reset_cycle, parent_id, sort_order, created_at)
		 SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7
		 WHERE ?5 IS NULL OR EXISTS (SELECT 1 FROM buttons WHERE id = ?5)
		 ON CONFLICT (id) DO UPDATE SET
			name = excluded.name, color = excluded.color, reset_cycle = excluded.reset_cycle,
			parent_id = excluded.parent_id, sort_order = excluded.sort_order`
	).bind(b.id, b.name, b.color, b.resetCycle, b.parentId, b.order, b.createdAt);

const upsertRecord = (r: TapRecord) =>
	env.DB.prepare(
		`INSERT INTO records (id, button_id, timestamp)
		 SELECT ?1, ?2, ?3 WHERE EXISTS (SELECT 1 FROM buttons WHERE id = ?2)
		 ON CONFLICT (id) DO UPDATE SET button_id = excluded.button_id, timestamp = excluded.timestamp`
	).bind(r.id, r.buttonId, r.timestamp);

function statementsFor(op: Op): D1PreparedStatement[] {
	switch (op.type) {
		case 'upsertButtons':
			return op.buttons.map(upsertButton);
		case 'deleteButtons':
			return op.ids.flatMap((id) => [
				env.DB.prepare('DELETE FROM records WHERE button_id = ?1').bind(id),
				env.DB.prepare('DELETE FROM buttons WHERE id = ?1').bind(id)
			]);
		case 'upsertRecords':
			return op.records.map(upsertRecord);
		case 'deleteRecords':
			return op.ids.map((id) => env.DB.prepare('DELETE FROM records WHERE id = ?1').bind(id));
		case 'clearRecords':
			return [env.DB.prepare('DELETE FROM records')];
		case 'replaceAll':
			return [
				env.DB.prepare('DELETE FROM records'),
				env.DB.prepare('DELETE FROM buttons'),
				...op.buttons.map(upsertButton),
				...op.records.map(upsertRecord)
			];
	}
}

/** Applies an op atomically (D1 batches run as a single transaction). */
export async function applyOpToDb(op: Op): Promise<void> {
	const statements = statementsFor(op);
	if (statements.length) await env.DB.batch(statements);
}
