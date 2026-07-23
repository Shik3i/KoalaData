import { db } from '$lib/server/db';
import { projects, projectSlugRedirects, dataSources, metricDefinitions } from '$lib/server/db/schema';
import { eq, and, isNull, inArray, sql } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { classifyChromeReportLabel, splitLegacyMetricName } from '$lib/dashboard-metrics';

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

	const sourceIds = sources.map((s) => s.id);
	const metricsWithData: any[] = [];

	if (sourceIds.length > 0) {
		// Fetch all metric definitions for this project's sources in one query
		const definitions = await db
			.select()
			.from(metricDefinitions)
			.where(inArray(metricDefinitions.sourceId, sourceIds));

		const metricIds = definitions.map((d) => d.id);

		if (metricIds.length > 0) {
			const snapshotMetricIds = definitions
				.filter((definition) => definition.metricType === 'custom'
					&& classifyChromeReportLabel(splitLegacyMetricName(definition.name).reportLabel)?.semantics === 'snapshot')
				.map((definition) => definition.id);
			const observationScope = snapshotMetricIds.length > 0
				? sql`(
					(metric_id IN (${sql.join(snapshotMetricIds.map((id) => sql`${id}`), sql`, `)}) AND snapshot_rn = 1)
					OR
					(metric_id NOT IN (${sql.join(snapshotMetricIds.map((id) => sql`${id}`), sql`, `)}) AND date >= COALESCE(
						(SELECT date(MAX(date), '-370 days') FROM effective_observations),
						date
					))
				)`
				: sql`date >= COALESCE(
					(SELECT date(MAX(date), '-370 days') FROM effective_observations),
					date
				)`;
			const trendRawScope = sql`o.date >= COALESCE(
				(SELECT date(MAX(recent.date), '-370 days')
				 FROM metric_observations recent
				 INNER JOIN import_batches recent_batch ON recent_batch.id = recent.import_batch_id
				 WHERE recent.metric_id IN (${sql.join(metricIds.map((id) => sql`${id}`), sql`, `)})
				   AND recent_batch.status = 'completed'
				   AND recent_batch.reverted_at IS NULL),
				o.date
			)`;
			const rawObservationScope = snapshotMetricIds.length > 0
				? sql`(
					(o.metric_id IN (${sql.join(snapshotMetricIds.map((id) => sql`${id}`), sql`, `)}) AND o.date = (
						SELECT MAX(latest.date)
						FROM metric_observations latest
						INNER JOIN import_batches latest_batch ON latest_batch.id = latest.import_batch_id
						WHERE latest.metric_id = o.metric_id
						  AND latest.dimensions = o.dimensions
						  AND latest_batch.status = 'completed'
						  AND latest_batch.reverted_at IS NULL
					))
					OR
					(o.metric_id NOT IN (${sql.join(snapshotMetricIds.map((id) => sql`${id}`), sql`, `)}) AND ${trendRawScope})
				)`
				: trendRawScope;

			// Query all effective observations for these metric IDs in one database round-trip
			const query = sql`
				WITH ranked_observations AS (
					SELECT 
						o.source_id,
						o.metric_id,
						o.date,
						o.value,
						o.dimensions,
						o.id AS observation_id,
						b.completed_at,
						ROW_NUMBER() OVER (
							PARTITION BY o.source_id, o.metric_id, o.date, o.dimensions
							ORDER BY b.completed_at DESC, o.id DESC
						) as rn
					FROM metric_observations o
					INNER JOIN import_batches b ON o.import_batch_id = b.id
					WHERE o.metric_id IN (${sql.join(metricIds.map((id) => sql`${id}`), sql`, `)})
					  AND b.status = 'completed'
					  AND b.reverted_at IS NULL
					  AND ${rawObservationScope}
				), effective_observations AS (
					SELECT source_id, metric_id, date, value, dimensions, observation_id, completed_at
					FROM ranked_observations
					WHERE rn = 1
				), scoped_observations AS (
					SELECT source_id, metric_id, date, value, dimensions, observation_id, completed_at,
						ROW_NUMBER() OVER (
							PARTITION BY metric_id, dimensions
							ORDER BY date DESC, completed_at DESC, observation_id DESC
						) AS snapshot_rn
					FROM effective_observations
				)
				SELECT source_id, metric_id, date, value, dimensions, observation_id, completed_at
				FROM scoped_observations
				WHERE ${observationScope}
				ORDER BY date ASC
			`;

			const observations = await db.all<{
				source_id: string;
				metric_id: string;
				date: string;
				value: number;
				dimensions: string;
				observation_id: string;
				completed_at: number | null;
			}>(query);

			// Group observations by metricId
			const obsMap = new Map<string, Array<{ date: string; value: number; dimensions: Record<string, string>; observationId: string; completedAt: number | null }>>();
			for (const o of observations) {
				if (!obsMap.has(o.metric_id)) {
					obsMap.set(o.metric_id, []);
				}
				let dimensions: Record<string, string> = {};
				try {
					const parsed = JSON.parse(o.dimensions);
					if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) dimensions = parsed;
				} catch {
					// Preserve malformed legacy rows as unsegmented observations.
				}
				obsMap.get(o.metric_id)!.push({
					date: o.date,
					value: o.value,
					dimensions,
					observationId: o.observation_id,
					completedAt: o.completed_at
				});
			}

			// Map into the SvelteKit expected output format
			for (const def of definitions) {
				const src = sources.find((s) => s.id === def.sourceId)!;
				const obs = obsMap.get(def.id) || [];
				metricsWithData.push({
					sourceId: src.id,
					sourceName: src.name,
					metricId: def.id,
					metricType: def.metricType,
					name: def.name,
					unit: def.unit,
					aggregation: def.aggregation,
					isCumulative: def.isCumulative,
					observations: obs.map((o) => ({
						date: o.date,
						value: o.value,
						dimensions: o.dimensions,
						observationId: o.observationId,
						completedAt: o.completedAt
					}))
				});
			}
		}
	}

	return {
		project,
		metrics: metricsWithData
	};
};
