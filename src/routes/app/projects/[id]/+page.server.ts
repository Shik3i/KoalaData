import { db } from '$lib/server/db';
import { dataSources, importBatches } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();

	// Fetch all data sources for this project
	const sources = await db
		.select()
		.from(dataSources)
		.where(eq(dataSources.projectId, project.id));

	// Fetch recent imports for this project
	const importsList = await db
		.select()
		.from(importBatches)
		.where(eq(importBatches.projectId, project.id))
		.orderBy(importBatches.createdAt)
		.limit(5);

	return {
		sources,
		importsList
	};
};
