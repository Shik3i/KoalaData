import {
	classifyChromeReportLabel,
	displayDimensionLabel,
	splitLegacyMetricName
} from '$lib/dashboard-metrics';
import db from './db';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { projects } from './db/schema';

export type PublicProjectStats = {
	activeUsers: number | null;
	installs: number | null;
	rating: number | null;
	ratingCount: number;
	lastDataDate: string | null;
};

const emptyStats = (): PublicProjectStats => ({
	activeUsers: null,
	installs: null,
	rating: null,
	ratingCount: 0,
	lastDataDate: null
});

const CACHE_TTL_MS = 30_000;
const statsCache = new Map<string, { value: Map<string, PublicProjectStats>; expiresAt: number }>();
const statsInFlight = new Map<string, Promise<Map<string, PublicProjectStats>>>();

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

export async function getPublicProjectStats(projectIds: string[]): Promise<Map<string, PublicProjectStats>> {
	const uniqueIds = [...new Set(projectIds)].sort();
	const cacheKey = uniqueIds.join(',');
	const now = Date.now();
	const cached = statsCache.get(cacheKey);
	if (cached && now < cached.expiresAt) return cached.value;
	if (cached) {
		if (!statsInFlight.has(cacheKey)) {
			void refreshPublicProjectStats(cacheKey, uniqueIds).catch((error) =>
				console.error('[Public Stats] Background refresh failed:', error)
			);
		}
		return cached.value;
	}
	return refreshPublicProjectStats(cacheKey, uniqueIds);
}

function refreshPublicProjectStats(cacheKey: string, uniqueIds: string[]): Promise<Map<string, PublicProjectStats>> {
	const existing = statsInFlight.get(cacheKey);
	if (existing) return existing;
	const refresh = computePublicProjectStats(uniqueIds)
		.then((value) => {
			const now = Date.now();
			statsCache.set(cacheKey, { value, expiresAt: now + CACHE_TTL_MS });
			while (statsCache.size > 50) statsCache.delete(statsCache.keys().next().value!);
			return value;
		})
		.finally(() => statsInFlight.delete(cacheKey));
	statsInFlight.set(cacheKey, refresh);
	return refresh;
}

export async function refreshAllPublicProjectStats(): Promise<void> {
	const rows = await db
		.select({ id: projects.id })
		.from(projects)
		.where(
			and(
				eq(projects.visibility, 'public'),
				isNull(projects.deletedAt),
				eq(projects.moderationStatus, 'active')
			)
		);
	const ids = rows.map((row) => row.id).sort();
	await refreshPublicProjectStats(ids.join(','), ids);
}

async function computePublicProjectStats(uniqueIds: string[]): Promise<Map<string, PublicProjectStats>> {
	const result = new Map(uniqueIds.map((id) => [id, emptyStats()]));
	if (uniqueIds.length === 0) return result;

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
			  AND md.metric_type IN ('active_users', 'installs', 'custom')
			  AND b.status = 'completed'
			  AND b.reverted_at IS NULL
		)
		SELECT project_id, metric_type, metric_name, date, value, dimensions
		FROM ranked_observations WHERE rn = 1
		ORDER BY date ASC
	`);

	const latest = new Map<string, { usersDate: string; installsDate: string }>();
	const ratings = new Map<string, { weighted: number; count: number }>();
	for (const row of rows) {
		const stats = result.get(row.project_id)!;
		const dates = latest.get(row.project_id) ?? { usersDate: '', installsDate: '' };
		if (!stats.lastDataDate || row.date > stats.lastDataDate) stats.lastDataDate = row.date;

		if (row.metric_type === 'active_users' && row.date >= dates.usersDate) {
			stats.activeUsers = row.value;
			dates.usersDate = row.date;
		} else if (row.metric_type === 'installs' && row.date >= dates.installsDate) {
			stats.installs = row.value;
			dates.installsDate = row.date;
		} else if (row.metric_type === 'custom') {
			const stars = ratingStars(row.metric_name, row.dimensions);
			if (stars !== null && row.value > 0) {
				const aggregate = ratings.get(row.project_id) ?? { weighted: 0, count: 0 };
				aggregate.weighted += stars * row.value;
				aggregate.count += row.value;
				ratings.set(row.project_id, aggregate);
			}
		}
		latest.set(row.project_id, dates);
	}

	for (const [projectId, aggregate] of ratings) {
		const stats = result.get(projectId)!;
		stats.rating = Math.round((aggregate.weighted / aggregate.count) * 100) / 100;
		stats.ratingCount = aggregate.count;
	}
	return result;
}
