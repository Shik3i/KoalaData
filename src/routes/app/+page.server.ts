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

	const [memberships, recentImports, limitState] = await Promise.all([
		db.select({ projectId: projectMembers.projectId })
			.from(projectMembers)
			.where(eq(projectMembers.userId, userId)),
		db.select()
			.from(importBatches)
			.where(eq(importBatches.userId, userId))
			.orderBy(desc(importBatches.createdAt))
			.limit(5),
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
	const ownedProjects = userProjects.filter((project) => project.ownerId === userId);
	const ownedProjectIds = ownedProjects.map((project) => project.id);
	const [sources, completedImports] = ownedProjectIds.length > 0
		? await Promise.all([
			db.select({ projectId: dataSources.projectId }).from(dataSources).where(inArray(dataSources.projectId, ownedProjectIds)),
			db.select({ projectId: importBatches.projectId })
				.from(importBatches)
				.where(and(
					inArray(importBatches.projectId, ownedProjectIds),
					eq(importBatches.status, 'completed'),
					isNull(importBatches.revertedAt)
				))
		])
		: [[], []];
	const sourceProjectIds = new Set(sources.map((source) => source.projectId));
	const importedProjectIds = new Set(completedImports.map((batch) => batch.projectId));
	const onboardingProjects = ownedProjects
		.map((project) => {
			const hasStoreConnection = Boolean(project.storeUrl);
			const hasSource = sourceProjectIds.has(project.id);
			const hasCompletedImport = importedProjectIds.has(project.id);
			const hasPublicListing = project.visibility === 'public' && project.moderationStatus === 'active';
			return {
				project,
				hasStoreConnection,
				hasSource,
				hasCompletedImport,
				hasPublicListing,
				progress: [hasStoreConnection, hasCompletedImport, hasPublicListing].filter(Boolean).length
			};
		})
		.sort((a, b) => b.progress - a.progress || a.project.name.localeCompare(b.project.name));
	const onboardingProject = onboardingProjects.find((entry) => !entry.hasPublicListing) ?? null;

	const { limits, usage } = limitState;

	return {
		user: locals.user,
		projects: userProjects,
		recentImports,
		limits,
		usage,
		onboarding: {
			hasProject: Boolean(onboardingProject),
			hasStoreConnection: onboardingProject?.hasStoreConnection ?? false,
			hasSource: onboardingProject?.hasSource ?? false,
			hasCompletedImport: onboardingProject?.hasCompletedImport ?? false,
			hasPublicListing: onboardingProject?.hasPublicListing ?? false,
			projectId: onboardingProject?.project.id ?? null,
			projectSlug: onboardingProject?.project.slug ?? null,
			projectName: onboardingProject?.project.name ?? null
		}
	};
};
