import type { LayoutServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';
import fs from 'fs';
import path from 'path';

function readVersion(): string {
	try {
		const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
		if (typeof pkg.version === 'string' && /^\d+\.\d+\.\d+$/.test(pkg.version)) {
			return pkg.version;
		}
	} catch (e) {
		console.error('[Layout Server] Failed to read version from package.json:', e);
	}
	return 'unreleased';
}

const version = readVersion();

export const load: LayoutServerLoad = async ({ locals }) => {
	const site = await getPublicSiteSettings();

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
