import { db } from '$lib/server/db';
import { dataSources, importBatches } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();

	// Fetch all data sources for this project
	const [sources, importsList] = await Promise.all([
		db.select().from(dataSources).where(eq(dataSources.projectId, project.id)),
		db.select().from(importBatches)
			.where(eq(importBatches.projectId, project.id))
			.orderBy(desc(importBatches.createdAt))
			.limit(5)
	]);

	return {
		sources,
		importsList
	};
};
