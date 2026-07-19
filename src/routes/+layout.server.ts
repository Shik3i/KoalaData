import type { LayoutServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';

export const load: LayoutServerLoad = async ({ locals }) => {
	const site = await getPublicSiteSettings();
	return {
		site,
		user: locals.user ? {
			id: locals.user.id,
			username: locals.user.username,
			role: locals.user.role,
			status: locals.user.status,
			forcePasswordChange: locals.user.forcePasswordChange
		} : null
	};
};
