import { db } from '$lib/server/db';
import { projects, importBatches } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getUserLimits } from '$lib/server/limits';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userId = locals.user.id;

	// Fetch projects owned by this user
	const userProjects = await db
		.select()
		.from(projects)
		.where(and(eq(projects.ownerId, userId), isNull(projects.deletedAt)))
		.orderBy(projects.name);

	// Fetch recent imports uploaded by this user
	const recentImports = await db
		.select()
		.from(importBatches)
		.where(eq(importBatches.userId, userId))
		.orderBy(importBatches.createdAt)
		.limit(5);

	// Fetch storage and limits metrics
	const { limits, usage } = await getUserLimits(userId);

	return {
		user: locals.user,
		projects: userProjects,
		recentImports,
		limits,
		usage
	};
};
