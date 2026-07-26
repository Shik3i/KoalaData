import { db } from '$lib/server/db';
import { dataSources, importBatches } from '$lib/server/db/schema';
import { listProjectEvents } from '$lib/server/project-events';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project } = await parent();

	// Fetch data sources, recent imports, and events
	const [sources, importsList, events] = await Promise.all([
		db.select().from(dataSources).where(eq(dataSources.projectId, project.id)),
		db.select().from(importBatches)
			.where(eq(importBatches.projectId, project.id))
			.orderBy(desc(importBatches.createdAt))
			.limit(5),
		listProjectEvents(project.id)
	]);

	return {
		sources,
		importsList,
		events
	};
};
