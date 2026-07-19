import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and, isNull, like, or, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url }) => {
	if (!(await getPublicSiteSettings()).publicDiscoveryEnabled) error(404, 'Project discovery is disabled.');
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

	const exploreList = await db
		.select()
		.from(projects)
		.where(and(...conditions))
		.orderBy(projects.name);

	return {
		exploreProjects: exploreList,
		searchQuery: query,
		categoryFilter: category
	};
};
