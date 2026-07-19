import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Authentication is enforced in hooks, but let's assert it for typing
	if (!locals.user) {
		throw fail(401);
	}

	return {
		user: locals.user
	};
};
