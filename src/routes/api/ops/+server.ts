import { parseOp } from '#lib/ops.ts';
import { applyOpToDb } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const op = parseOp(await request.json().catch(() => null));
	if (!op) return Response.json({ error: 'Invalid op' }, { status: 400 });
	await applyOpToDb(op);
	return new Response(null, { status: 204 });
};
