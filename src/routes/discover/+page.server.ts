import { db } from '$lib/server/db';
import { projects, publicProjectStats } from '$lib/server/db/schema';
import { eq, and, isNull, like, or, count, asc, desc, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';
import { error } from '@sveltejs/kit';
import { isPricingModel } from '$lib/project-classification';

const PAGE_SIZE = 24;

export const load: PageServerLoad = async ({ url }) => {
	if (!(await getPublicSiteSettings()).publicDiscoveryEnabled) error(404, 'Project discovery is disabled.');
	const query = url.searchParams.get('q')?.trim() || '';
	const category = url.searchParams.get('category')?.trim() || '';
	const requestedPricing = url.searchParams.get('pricing')?.trim() || '';
	const pricing = isPricingModel(requestedPricing) ? requestedPricing : '';
	const openSource = url.searchParams.get('openSource') === '1';
	const requestedSort = url.searchParams.get('sort')?.trim() || 'name';
	const sort = ['name', 'rating', 'users', 'installs', 'updated'].includes(requestedSort) ? requestedSort : 'name';
	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

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

	const totalResult = await db
		.select({ value: count() })
		.from(projects)
		.where(and(...conditions));
	const total = totalResult[0]?.value ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const order = sort === 'rating'
		? desc(publicProjectStats.rating)
		: sort === 'users'
			? desc(publicProjectStats.activeUsers)
			: sort === 'installs'
				? desc(publicProjectStats.installs)
				: sort === 'updated'
					? desc(projects.updatedAt)
					: asc(projects.name);

	const exploreProjects = await db
		.select({
			id: projects.id,
			name: projects.name,
			slug: projects.slug,
			shortDescription: projects.shortDescription,
			storeUrl: projects.storeUrl,
			category: projects.category,
			pricingModel: projects.pricingModel,
			isOpenSource: projects.isOpenSource,
			logoPath: projects.logoPath,
			verificationStatus: projects.verificationStatus,
			updatedAt: projects.updatedAt,
			activeUsers: publicProjectStats.activeUsers,
			installs: publicProjectStats.installs,
			rating: publicProjectStats.rating
		})
		.from(projects)
		.leftJoin(publicProjectStats, eq(publicProjectStats.projectId, projects.id))
		.where(and(...conditions))
		.orderBy(order, asc(projects.name))
		.limit(PAGE_SIZE)
		.offset((currentPage - 1) * PAGE_SIZE);

	return {
		exploreProjects,
		searchQuery: query,
		categoryFilter: category,
		pricingFilter: pricing,
		openSourceFilter: openSource,
		sort,
		pagination: { page: currentPage, pageSize: PAGE_SIZE, total, totalPages }
	};
};
