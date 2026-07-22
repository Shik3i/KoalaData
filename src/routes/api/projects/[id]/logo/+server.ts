import { assertProjectAccess } from '$lib/server/permissions';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fs from 'fs';
import path from 'path';

export const GET: RequestHandler = async ({ params, locals }) => {
	const projectId = params.id;

	// Enforce visibility permissions. Guests can see logos of public/unlisted projects.
	const userId = locals.user?.id || null;
	const { project } = await assertProjectAccess(userId, projectId, 'viewer');

	if (!project.logoPath) {
		throw error(404, 'Logo not found for this project.');
	}

	const dataDir = process.env.DATA_DIRECTORY || './data';
	const assetsDir = path.join(dataDir, 'project-assets');
	if (path.basename(project.logoPath) !== project.logoPath) {
		throw error(400, 'Invalid logo filename.');
	}
	const logoFilePath = path.resolve(assetsDir, project.logoPath);

	if (!fs.existsSync(logoFilePath)) {
		throw error(404, 'Logo file does not exist.');
	}

	const buffer = fs.readFileSync(logoFilePath);
	let contentType = 'image/png';
	if (project.logoPath.endsWith('.jpg') || project.logoPath.endsWith('.jpeg')) {
		contentType = 'image/jpeg';
	} else if (project.logoPath.endsWith('.webp')) {
		contentType = 'image/webp';
	}

	return new Response(buffer, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400'
		}
	});
};
