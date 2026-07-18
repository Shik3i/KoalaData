import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and, isNull, like, or } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() || '';
	const category = url.searchParams.get('category')?.trim() || '';

	const conditions = [
		eq(projects.visibility, 'public'),
		isNull(projects.deletedAt),
		eq(projects.moderationStatus, 'active')
	];

	if (query) {
		conditions.push(
			or(
				like(projects.name, `%${query}%`),
				like(projects.shortDescription, `%${query}%`)
			)
		);
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
