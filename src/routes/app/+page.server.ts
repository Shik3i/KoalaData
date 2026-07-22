import { db } from '$lib/server/db';
import { projects, importBatches, dataSources } from '$lib/server/db/schema';
import { eq, and, isNull, inArray } from 'drizzle-orm';
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

	const projectIds = userProjects.map((project) => project.id);
	const sources = projectIds.length > 0
		? await db.select().from(dataSources).where(inArray(dataSources.projectId, projectIds))
		: [];
	const firstProject = userProjects[0] ?? null;
	const hasCompletedImport = recentImports.some((batch) => batch.status === 'completed' && !batch.revertedAt);
	const hasPublicListing = userProjects.some((project) => project.visibility === 'public' && project.moderationStatus === 'active');

	// Fetch storage and limits metrics
	const { limits, usage } = await getUserLimits(userId);

	return {
		user: locals.user,
		projects: userProjects,
		recentImports,
		limits,
		usage,
		onboarding: {
			hasProject: Boolean(firstProject),
			hasStoreConnection: userProjects.some((project) => Boolean(project.storeUrl)),
			hasSource: sources.length > 0,
			hasCompletedImport,
			hasPublicListing,
			projectId: firstProject?.id ?? null,
			projectSlug: firstProject?.slug ?? null
		}
	};
};
