import type { LayoutServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';
import fs from 'fs';
import path from 'path';

export const load: LayoutServerLoad = async ({ locals }) => {
	const site = await getPublicSiteSettings();
	let version = '1.0.4';
	try {
		const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
		version = pkg.version || '1.0.4';
	} catch (e) {
		console.error('[Layout Server] Failed to read version from package.json:', e);
	}

	return {
		site,
		version,
		user: locals.user ? {
			id: locals.user.id,
			username: locals.user.username,
			role: locals.user.role,
			status: locals.user.status,
			forcePasswordChange: locals.user.forcePasswordChange
		} : null
	};
};
