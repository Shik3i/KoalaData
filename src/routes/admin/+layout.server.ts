import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?error=admin_required');
	}

	if (locals.user.status === 'pending') {
		throw redirect(302, '/login?error=pending_approval');
	}

	return {
		user: locals.user
	};
};
