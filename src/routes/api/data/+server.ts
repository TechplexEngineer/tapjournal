import { loadJournal } from '#lib/server/db.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	return Response.json(await loadJournal(), { headers: { 'cache-control': 'no-store' } });
};
