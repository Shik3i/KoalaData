import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema';
import { limit } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Run a simple query to verify database health
		const result = await db.select().from(systemSettings).limit(1);
		
		return json({
			status: 'ok',
			timestamp: Math.floor(Date.now() / 1000),
			database: 'healthy',
			tables: result.length >= 0 ? 'online' : 'error'
		});
	} catch (e) {
		console.error('[Health Check] Database check failed:', e);
		return new Response(
			JSON.stringify({
				status: 'error',
				error: 'Database connection failed'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
