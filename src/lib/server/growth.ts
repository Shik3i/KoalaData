import db from './db';
import { sql } from 'drizzle-orm';
import { getPublicProjectStats } from './public-project-stats';

export interface ProjectLeaderboardItem {
	projectId: string;
	name: string;
	slug: string;
	category: string;
	shortDescription: string;
	logoPath: string | null;
	websiteUrl: string | null;
	pricingModel: string;
	isOpenSource: number;
	rating: number | null;
	ratingCount: number;
	activeUsers: number;
	installs: number;
	growth: number;
	growthPercent: number;
	lastDataDate: string;
}

// Stale data cutoff tolerance: 14 days
const STALENESS_CUTOFF_DAYS = 14;
const CACHE_TTL_MS = 30_000;
let leaderboardCache: { value: ProjectLeaderboardItem[]; expiresAt: number } | null = null;
let leaderboardInFlight: Promise<ProjectLeaderboardItem[]> | null = null;

/**
 * Computes growth metrics and stats for opted-in and approved public projects.
 * Calculates WAUs and growth values over the last 30 days.
 * Results are returned sorted by absolute growth DESC.
 */
export async function getLeaderboard(): Promise<ProjectLeaderboardItem[]> {
	const now = Date.now();
	if (leaderboardCache && now < leaderboardCache.expiresAt) return leaderboardCache.value;
	if (leaderboardCache) {
		if (!leaderboardInFlight) {
			void refreshLeaderboard().catch((error) => console.error('[Leaderboard] Background refresh failed:', error));
		}
		return leaderboardCache.value;
	}
	return refreshLeaderboard();
}

function refreshLeaderboard(): Promise<ProjectLeaderboardItem[]> {
	if (leaderboardInFlight) return leaderboardInFlight;
	leaderboardInFlight = computeLeaderboard()
		.then((value) => {
			const now = Date.now();
			leaderboardCache = { value, expiresAt: now + CACHE_TTL_MS };
			return value;
		})
		.finally(() => {
			leaderboardInFlight = null;
		});
	return leaderboardInFlight;
}

export async function refreshLeaderboardCache(): Promise<void> {
	await refreshLeaderboard();
}

async function computeLeaderboard(): Promise<ProjectLeaderboardItem[]> {
	// Fetch all effective observations for public, approved, active, and opted-in projects
	// for the active_users and installs metrics in a single database round-trip.
	const query = sql`
		WITH ranked_observations AS (
			SELECT 
				p.id AS project_id,
				p.name AS project_name,
				p.slug AS project_slug,
				p.category AS project_category,
				p.short_description AS project_short_description,
				p.logo_path AS project_logo_path,
				p.website_url AS project_website_url,
				p.pricing_model AS project_pricing_model,
				p.is_open_source AS project_is_open_source,
				md.metric_type,
				o.date,
				o.value,
				ROW_NUMBER() OVER (
					PARTITION BY md.id, o.date, o.dimensions
					ORDER BY b.completed_at DESC, o.id DESC
				) as rn
			FROM projects p
			INNER JOIN data_sources ds ON ds.project_id = p.id
			INNER JOIN metric_definitions md ON md.source_id = ds.id
			INNER JOIN metric_observations o ON o.metric_id = md.id
			INNER JOIN import_batches b ON o.import_batch_id = b.id
			WHERE p.visibility = 'public'
			  AND p.leaderboard_opt_in = 1
			  AND p.leaderboard_status = 'approved'
			  AND p.deleted_at IS NULL
			  AND p.moderation_status = 'active'
			  AND md.metric_type IN ('active_users', 'installs')
			  AND b.status = 'completed'
			  AND b.reverted_at IS NULL
		)
		SELECT 
			project_id,
			project_name,
			project_slug,
			project_category,
			project_short_description,
			project_logo_path,
			project_website_url,
			project_pricing_model,
			project_is_open_source,
			metric_type,
			date,
			value
		FROM ranked_observations
		WHERE rn = 1
		ORDER BY project_id, metric_type, date ASC
	`;

	const rows = await db.all<{
		project_id: string;
		project_name: string;
		project_slug: string;
		project_category: string;
		project_short_description: string;
		project_logo_path: string | null;
		project_website_url: string | null;
		project_pricing_model: string;
		project_is_open_source: number;
		metric_type: 'active_users' | 'installs';
		date: string;
		value: number;
	}>(query);

	// Group observations by project
	const projectGroups = new Map<string, {
		name: string;
		slug: string;
		category: string;
		shortDescription: string;
		logoPath: string | null;
		websiteUrl: string | null;
		pricingModel: string;
		isOpenSource: number;
		activeUsersObs: Array<{ date: string; value: number }>;
		installsObs: Array<{ date: string; value: number }>;
	}>();

	for (const row of rows) {
		if (!projectGroups.has(row.project_id)) {
			projectGroups.set(row.project_id, {
				name: row.project_name,
				slug: row.project_slug,
				category: row.project_category,
				shortDescription: row.project_short_description,
				logoPath: row.project_logo_path,
				websiteUrl: row.project_website_url,
				pricingModel: row.project_pricing_model,
				isOpenSource: row.project_is_open_source,
				activeUsersObs: [],
				installsObs: []
			});
		}
		const group = projectGroups.get(row.project_id)!;
		if (row.metric_type === 'active_users') {
			group.activeUsersObs.push({ date: row.date, value: row.value });
		} else if (row.metric_type === 'installs') {
			group.installsObs.push({ date: row.date, value: row.value });
		}
	}

	const items: ProjectLeaderboardItem[] = [];
	const projectStats = await getPublicProjectStats([...projectGroups.keys()]);
	const nowTime = Date.now();

	for (const [projectId, group] of projectGroups.entries()) {
		let activeUsers = 0;
		let installs = 0;
		let growth = 0;
		let growthPercent = 0;
		let hasValidData = false;
		const validDataDates: string[] = [];

		// Process active_users
		const activeObs = group.activeUsersObs;
		if (activeObs.length > 0) {
			const latestObs = activeObs[activeObs.length - 1];
			const latestDate = new Date(latestObs.date);

			// Enforce staleness cutoff tolerance (14 days)
			const diffStaleMs = nowTime - latestDate.getTime();
			const diffStaleDays = diffStaleMs / (1000 * 60 * 60 * 24);

			if (diffStaleDays >= 0 && diffStaleDays <= STALENESS_CUTOFF_DAYS) {
				const latestVal = latestObs.value;
				activeUsers = latestVal;
				hasValidData = true;
				validDataDates.push(latestObs.date);

				// Locate observation close to 30 days prior (tolerating irregular reporting intervals)
				let pastVal = activeObs[0].value;
				for (let i = activeObs.length - 1; i >= 0; i--) {
					const obsDate = new Date(activeObs[i].date);
					const diffDays = Math.round((latestDate.getTime() - obsDate.getTime()) / (1000 * 60 * 60 * 24));
					if (diffDays >= 30) {
						pastVal = activeObs[i].value;
						break;
					}
				}

				growth = latestVal - pastVal;

				// Enforce the minimum starting value of 25 for percentage-growth calculation
				if (pastVal >= 25) {
					growthPercent = (growth / pastVal) * 100;
				} else {
					growthPercent = 0;
				}
			} else {
				console.log(`[Growth] Project ${group.name} excluded due to stale active users data (${Math.round(diffStaleDays)} days old).`);
			}
		}

		// Process installs
		const instObs = group.installsObs;
		if (instObs.length > 0) {
			const latestInstall = instObs[instObs.length - 1];
			const installAgeDays = (nowTime - new Date(latestInstall.date).getTime()) / (1000 * 60 * 60 * 24);
			if (installAgeDays >= 0 && installAgeDays <= STALENESS_CUTOFF_DAYS) {
				installs = latestInstall.value;
				hasValidData = true;
				validDataDates.push(latestInstall.date);
			}
		}

		if (hasValidData) {
			const stats = projectStats.get(projectId)!;
			const lastDataDate = validDataDates.sort().at(-1)!;
			items.push({
				projectId,
				name: group.name,
				slug: group.slug,
				category: group.category,
				shortDescription: group.shortDescription,
				logoPath: group.logoPath,
				websiteUrl: group.websiteUrl,
				pricingModel: group.pricingModel,
				isOpenSource: group.isOpenSource,
				rating: stats.rating,
				ratingCount: stats.ratingCount,
				activeUsers,
				installs,
				growth,
				growthPercent,
				lastDataDate
			});
		}
	}

	// Sort by absolute growth descending
	return items.sort((a, b) => b.growth - a.growth);
}
