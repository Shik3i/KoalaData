import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and, isNull, like, or, type SQL } from 'drizzle-orm';
import { getLeaderboard } from '$lib/server/growth';
import type { PageServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';

export const load: PageServerLoad = async ({ url }) => {
	const site = await getPublicSiteSettings();
	const query = url.searchParams.get('q')?.trim() || '';
	const category = url.searchParams.get('category')?.trim() || '';

	const conditions: SQL<unknown>[] = [
		eq(projects.visibility, 'public'),
		isNull(projects.deletedAt),
		eq(projects.moderationStatus, 'active')
	];

	if (query) {
		const searchCondition = or(
				like(projects.name, `%${query}%`),
				like(projects.shortDescription, `%${query}%`)
			);
		if (searchCondition) conditions.push(searchCondition);
	}

	if (category) {
		conditions.push(eq(projects.category, category as any));
	}

	// Fetch matching projects
	const exploreList = site.publicDiscoveryEnabled ? await db
		.select()
		.from(projects)
		.where(and(...conditions))
		.orderBy(projects.name) : [];

	// Fetch leaderboard rankings
	const leaderboard = site.publicLeaderboardsEnabled ? await getLeaderboard() : [];

	return {
		exploreProjects: exploreList,
		leaderboard,
		searchQuery: query,
		categoryFilter: category
	};
};
