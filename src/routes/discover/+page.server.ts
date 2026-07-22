import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and, isNull, like, or, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';
import { error } from '@sveltejs/kit';
import { getPublicProjectStats } from '$lib/server/public-project-stats';
import { isPricingModel } from '$lib/project-classification';

export const load: PageServerLoad = async ({ url }) => {
	if (!(await getPublicSiteSettings()).publicDiscoveryEnabled) error(404, 'Project discovery is disabled.');
	const query = url.searchParams.get('q')?.trim() || '';
	const category = url.searchParams.get('category')?.trim() || '';
	const requestedPricing = url.searchParams.get('pricing')?.trim() || '';
	const pricing = isPricingModel(requestedPricing) ? requestedPricing : '';
	const openSource = url.searchParams.get('openSource') === '1';
	const requestedSort = url.searchParams.get('sort')?.trim() || 'name';
	const sort = ['name', 'rating', 'users', 'installs', 'updated'].includes(requestedSort) ? requestedSort : 'name';

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
	if (pricing) conditions.push(eq(projects.pricingModel, pricing));
	if (openSource) conditions.push(eq(projects.isOpenSource, 1));

	const exploreList = await db
		.select()
		.from(projects)
		.where(and(...conditions))
		.orderBy(projects.name);

	const stats = await getPublicProjectStats(exploreList.map((project) => project.id));
	const exploreProjects = exploreList.map((project) => ({ ...project, ...stats.get(project.id)! }));
	if (sort === 'rating') exploreProjects.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
	else if (sort === 'users') exploreProjects.sort((a, b) => (b.activeUsers ?? -1) - (a.activeUsers ?? -1));
	else if (sort === 'installs') exploreProjects.sort((a, b) => (b.installs ?? -1) - (a.installs ?? -1));
	else if (sort === 'updated') exploreProjects.sort((a, b) => b.updatedAt - a.updatedAt);

	return {
		exploreProjects,
		searchQuery: query,
		categoryFilter: category,
		pricingFilter: pricing,
		openSourceFilter: openSource,
		sort
	};
};
