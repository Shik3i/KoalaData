import {
	classifyChromeReportLabel,
	displayDimensionLabel,
	splitLegacyMetricName
} from '$lib/dashboard-metrics';
import db from './db';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { dataSources, metricDefinitions, projects, publicProjectStats } from './db/schema';

export type PublicProjectStats = {
	activeUsers: number | null;
	activeUsersDate: string | null;
	installs: number | null;
	installsDate: string | null;
	rating: number | null;
	ratingCount: number;
	lastDataDate: string | null;
	growth: number;
	growthPercent: number;
};

const emptyStats = (): PublicProjectStats => ({
	activeUsers: null,
	activeUsersDate: null,
	installs: null,
	installsDate: null,
	rating: null,
	ratingCount: 0,
	lastDataDate: null,
	growth: 0,
	growthPercent: 0
});

export function ratingStars(name: string, dimensions: string): number | null {
	const { reportLabel, seriesLabel } = splitLegacyMetricName(name);
	let dimensionLabel: string | null = null;
	try {
		const parsed = JSON.parse(dimensions) as Record<string, unknown>;
		if (typeof parsed.rating === 'string') dimensionLabel = parsed.rating;
	} catch {
		// Legacy observations may not contain valid dimension JSON.
	}
	if (classifyChromeReportLabel(reportLabel)?.id !== 'ratings') return null;
	const label = dimensionLabel ?? seriesLabel;
	if (!label) return null;
	const match = displayDimensionLabel(label).match(/(?:^|\D)([1-5])(?:\D|$)/);
	return match ? Number(match[1]) : null;
}

/** Fast request-path lookup. This function never reads raw observations. */
export async function getPublicProjectStats(projectIds: string[]): Promise<Map<string, PublicProjectStats>> {
	const uniqueIds = [...new Set(projectIds)].sort();
	if (uniqueIds.length === 0) return new Map();
	const rows = await db
		.select()
		.from(publicProjectStats)
		.where(inArray(publicProjectStats.projectId, uniqueIds));
	const byProject = new Map(rows.map((row) => [row.projectId, {
		activeUsers: row.activeUsers,
		activeUsersDate: row.activeUsersDate,
		installs: row.installs,
		installsDate: row.installsDate,
		rating: row.rating,
		ratingCount: row.ratingCount,
		lastDataDate: row.lastDataDate,
		growth: row.growth,
		growthPercent: row.growthPercent
	}]));
	return new Map(uniqueIds.map((id) => [id, byProject.get(id) ?? emptyStats()]));
}

export async function refreshAllPublicProjectStats(): Promise<void> {
	const rows = await db
		.select({ id: projects.id })
		.from(projects)
		.where(and(
			eq(projects.visibility, 'public'),
			isNull(projects.deletedAt),
			eq(projects.moderationStatus, 'active')
		));
	await refreshPublicProjectStats(rows.map((row) => row.id));
}

/** Write-path/background refresh. Raw observation work stays out of page requests. */
export async function refreshPublicProjectStats(projectIds: string[]): Promise<void> {
	const uniqueIds = [...new Set(projectIds)].sort();
	if (uniqueIds.length === 0) return;
	const computed = await computePublicProjectStats(uniqueIds);
	const refreshedAt = Math.floor(Date.now() / 1000);
	db.transaction((tx) => {
		for (const [projectId, stats] of computed) {
			const values = { projectId, ...stats, refreshedAt };
			tx.insert(publicProjectStats)
				.values(values)
				.onConflictDoUpdate({
					target: publicProjectStats.projectId,
					set: {
						activeUsers: stats.activeUsers,
						activeUsersDate: stats.activeUsersDate,
						installs: stats.installs,
						installsDate: stats.installsDate,
						rating: stats.rating,
						ratingCount: stats.ratingCount,
						lastDataDate: stats.lastDataDate,
						growth: stats.growth,
						growthPercent: stats.growthPercent,
						refreshedAt
					}
				})
				.run();
		}
	});
}

async function computePublicProjectStats(uniqueIds: string[]): Promise<Map<string, PublicProjectStats>> {
	const result = new Map(uniqueIds.map((id) => [id, emptyStats()]));
	const definitions = await db
		.select({
			id: metricDefinitions.id,
			metricType: metricDefinitions.metricType,
			name: metricDefinitions.name
		})
		.from(metricDefinitions)
		.innerJoin(dataSources, eq(metricDefinitions.sourceId, dataSources.id))
		.where(inArray(dataSources.projectId, uniqueIds));
	const relevantMetricIds = definitions
		.filter((definition) => definition.metricType === 'active_users'
			|| definition.metricType === 'installs'
			|| (definition.metricType === 'custom'
				&& classifyChromeReportLabel(splitLegacyMetricName(definition.name).reportLabel)?.id === 'ratings'))
		.map((definition) => definition.id);
	if (relevantMetricIds.length === 0) return result;
	const rows = await db.all<{
		project_id: string;
		metric_type: string;
		metric_name: string;
		date: string;
		value: number;
		dimensions: string;
	}>(sql`
		WITH ranked_observations AS (
			SELECT p.id AS project_id, md.id AS metric_id, md.metric_type, md.name AS metric_name,
				o.date, o.value, o.dimensions,
				ROW_NUMBER() OVER (
					PARTITION BY md.id, o.date, o.dimensions
					ORDER BY b.completed_at DESC, o.id DESC
				) AS rn
			FROM projects p
			INNER JOIN data_sources ds ON ds.project_id = p.id
			INNER JOIN metric_definitions md ON md.source_id = ds.id
			INNER JOIN metric_observations o ON o.metric_id = md.id
			INNER JOIN import_batches b ON b.id = o.import_batch_id
			WHERE p.id IN (${sql.join(uniqueIds.map((id) => sql`${id}`), sql`, `)})
			  AND md.id IN (${sql.join(relevantMetricIds.map((id) => sql`${id}`), sql`, `)})
			  AND b.status = 'completed'
			  AND b.reverted_at IS NULL
		)
		SELECT project_id, metric_type, metric_name, date, value, dimensions
		FROM ranked_observations WHERE rn = 1
		ORDER BY project_id, date ASC
	`);

	const activeHistory = new Map<string, Array<{ date: string; value: number }>>();
	const ratings = new Map<string, { weighted: number; count: number }>();
	for (const row of rows) {
		const stats = result.get(row.project_id)!;
		if (!stats.lastDataDate || row.date > stats.lastDataDate) stats.lastDataDate = row.date;

		if (row.metric_type === 'active_users') {
			const history = activeHistory.get(row.project_id) ?? [];
			history.push({ date: row.date, value: row.value });
			activeHistory.set(row.project_id, history);
			if (!stats.activeUsersDate || row.date >= stats.activeUsersDate) {
				stats.activeUsers = row.value;
				stats.activeUsersDate = row.date;
			}
		} else if (row.metric_type === 'installs') {
			if (!stats.installsDate || row.date >= stats.installsDate) {
				stats.installs = row.value;
				stats.installsDate = row.date;
			}
		} else {
			const stars = ratingStars(row.metric_name, row.dimensions);
			if (stars !== null && row.value > 0) {
				const aggregate = ratings.get(row.project_id) ?? { weighted: 0, count: 0 };
				aggregate.weighted += stars * row.value;
				aggregate.count += row.value;
				ratings.set(row.project_id, aggregate);
			}
		}
	}

	for (const [projectId, history] of activeHistory) {
		const stats = result.get(projectId)!;
		const latest = history.at(-1)!;
		let pastValue = history[0].value;
		for (let index = history.length - 1; index >= 0; index--) {
			const days = Math.round((new Date(latest.date).getTime() - new Date(history[index].date).getTime()) / 86_400_000);
			if (days >= 30) {
				pastValue = history[index].value;
				break;
			}
		}
		stats.growth = latest.value - pastValue;
		stats.growthPercent = pastValue >= 25 ? (stats.growth / pastValue) * 100 : 0;
	}

	for (const [projectId, aggregate] of ratings) {
		const stats = result.get(projectId)!;
		stats.rating = Math.round((aggregate.weighted / aggregate.count) * 100) / 100;
		stats.ratingCount = aggregate.count;
	}
	return result;
}
