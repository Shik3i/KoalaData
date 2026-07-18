import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user ? {
			id: locals.user.id,
			username: locals.user.username,
			displayName: locals.user.displayName,
			role: locals.user.role,
			status: locals.user.status,
			forcePasswordChange: locals.user.forcePasswordChange
		} : null
	};
};
