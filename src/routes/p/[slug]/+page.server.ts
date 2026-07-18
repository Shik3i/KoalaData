import { db } from '$lib/server/db';
import { projects, projectSlugRedirects, dataSources, metricDefinitions } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { getEffectiveObservations } from '$lib/server/observations';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const slug = params.slug;

	// 1. Resolve slug (check redirect logs first)
	const redirectRecord = await db
		.select()
		.from(projectSlugRedirects)
		.where(eq(projectSlugRedirects.oldSlug, slug))
		.limit(1);

	if (redirectRecord.length > 0) {
		throw redirect(301, `/p/${redirectRecord[0].newSlug}`);
	}

	// 2. Fetch project by slug
	const projectRecord = await db
		.select()
		.from(projects)
		.where(and(eq(projects.slug, slug), isNull(projects.deletedAt)))
		.limit(1);

	if (projectRecord.length === 0) {
		throw error(404, 'Project not found.');
	}

	const project = projectRecord[0];

	// 3. Enforce visibility access constraints
	const userId = locals.user?.id || null;
	await assertProjectAccess(userId, project.id, 'viewer');

	// 4. Fetch all data sources for this project
	const sources = await db
		.select()
		.from(dataSources)
		.where(eq(dataSources.projectId, project.id));

	// 5. Build structured metrics data
	const metricsWithData: any[] = [];
	for (const src of sources) {
		const definitions = await db
			.select()
			.from(metricDefinitions)
			.where(eq(metricDefinitions.sourceId, src.id));

		for (const def of definitions) {
			const observations = await getEffectiveObservations(src.id, def.id);
			metricsWithData.push({
				sourceName: src.name,
				metricId: def.id,
				metricType: def.metricType,
				name: def.name,
				unit: def.unit,
				isCumulative: def.isCumulative,
				observations: observations.map(o => ({
					date: o.date,
					value: o.value
				}))
			});
		}
	}

	return {
		project,
		metrics: metricsWithData
	};
};
