import { db } from '$lib/server/db';
import { projects, projectMembers, importBatches, dataSources } from '$lib/server/db/schema';
import { eq, and, isNull, inArray, or, desc } from 'drizzle-orm';
import { getUserLimits } from '$lib/server/limits';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userId = locals.user.id;

	const [memberships, recentImports, completedImport, limitState] = await Promise.all([
		db.select({ projectId: projectMembers.projectId })
			.from(projectMembers)
			.where(eq(projectMembers.userId, userId)),
		db.select()
			.from(importBatches)
			.where(eq(importBatches.userId, userId))
			.orderBy(desc(importBatches.createdAt))
			.limit(5),
		db.select({ id: importBatches.id })
			.from(importBatches)
			.where(and(eq(importBatches.userId, userId), eq(importBatches.status, 'completed'), isNull(importBatches.revertedAt)))
			.limit(1),
		getUserLimits(userId)
	]);
	const memberProjectIds = memberships.map((membership) => membership.projectId);
	const accessCondition = memberProjectIds.length > 0
		? or(eq(projects.ownerId, userId), inArray(projects.id, memberProjectIds))
		: eq(projects.ownerId, userId);
	const userProjects = await db
		.select()
		.from(projects)
		.where(and(accessCondition, isNull(projects.deletedAt)))
		.orderBy(projects.name);

	const projectIds = userProjects.map((project) => project.id);
	const sources = projectIds.length > 0
		? await db.select().from(dataSources).where(inArray(dataSources.projectId, projectIds))
		: [];
	const ownedProjects = userProjects.filter((project) => project.ownerId === userId);
	const firstProject = ownedProjects[0] ?? null;
	const hasCompletedImport = completedImport.length > 0;
	const hasPublicListing = ownedProjects.some((project) => project.visibility === 'public' && project.moderationStatus === 'active');

	const { limits, usage } = limitState;

	return {
		user: locals.user,
		projects: userProjects,
		recentImports,
		limits,
		usage,
		onboarding: {
			hasProject: Boolean(firstProject),
			hasStoreConnection: ownedProjects.some((project) => Boolean(project.storeUrl)),
			hasSource: sources.some((source) => ownedProjects.some((project) => project.id === source.projectId)),
			hasCompletedImport,
			hasPublicListing,
			projectId: firstProject?.id ?? null,
			projectSlug: firstProject?.slug ?? null
		}
	};
};
