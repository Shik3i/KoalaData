import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

export const GET: RequestHandler = async ({ params, locals }) => {
	const slug = params.slug;

	// Verify that the project actually exists and is active
	const projectRecord = await db
		.select()
		.from(projects)
		.where(and(eq(projects.slug, slug), isNull(projects.deletedAt)))
		.limit(1);

	if (projectRecord.length === 0) {
		throw error(404, 'Project not found.');
	}
	await assertProjectAccess(locals.user?.id ?? null, projectRecord[0].id, 'viewer');

	// Load the actual binary PNG fallback card
	const pngPath = path.resolve('static/og-koaladata.png');

	if (!fs.existsSync(pngPath)) {
		throw error(404, 'OG image fallback file missing.');
	}

	const buffer = fs.readFileSync(pngPath);

	return new Response(buffer, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
			'Content-Length': String(buffer.byteLength)
		}
	});
};
