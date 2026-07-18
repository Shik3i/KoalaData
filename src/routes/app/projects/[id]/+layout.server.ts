import { assertProjectAccess } from '$lib/server/permissions';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params, locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const projectId = params.id;
	// Assert project exists and user is owner or editor or admin
	const { project, membershipRole } = await assertProjectAccess(locals.user.id, projectId, 'viewer');

	return {
		project,
		membershipRole
	};
};
