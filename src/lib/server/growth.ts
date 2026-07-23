import db from './db';
import { sql } from 'drizzle-orm';

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

const STALENESS_CUTOFF_DAYS = 14;

/** Small materialized-table read. No raw observation work is allowed here. */
export async function getLeaderboard(): Promise<ProjectLeaderboardItem[]> {
	const today = new Date().toISOString().slice(0, 10);
	const cutoffDate = new Date(Date.now() - STALENESS_CUTOFF_DAYS * 86_400_000).toISOString().slice(0, 10);
	const rows = await db.all<{
		project_id: string;
		name: string;
		slug: string;
		category: string;
		short_description: string;
		logo_path: string | null;
		website_url: string | null;
		pricing_model: string;
		is_open_source: number;
		rating: number | null;
		rating_count: number;
		active_users: number;
		installs: number;
		growth: number;
		growth_percent: number;
		last_data_date: string;
	}>(sql`
		SELECT
			p.id AS project_id,
			p.name,
			p.slug,
			p.category,
			p.short_description,
			p.logo_path,
			p.website_url,
			p.pricing_model,
			p.is_open_source,
			s.rating,
			s.rating_count,
			CASE WHEN s.active_users_date BETWEEN ${cutoffDate} AND ${today}
				THEN COALESCE(s.active_users, 0) ELSE 0 END AS active_users,
			CASE WHEN s.installs_date BETWEEN ${cutoffDate} AND ${today}
				THEN COALESCE(s.installs, 0) ELSE 0 END AS installs,
			CASE WHEN s.active_users_date BETWEEN ${cutoffDate} AND ${today}
				THEN s.growth ELSE 0 END AS growth,
			CASE WHEN s.active_users_date BETWEEN ${cutoffDate} AND ${today}
				THEN s.growth_percent ELSE 0 END AS growth_percent,
			CASE
				WHEN s.active_users_date BETWEEN ${cutoffDate} AND ${today}
					AND s.installs_date BETWEEN ${cutoffDate} AND ${today}
					THEN MAX(s.active_users_date, s.installs_date)
				WHEN s.active_users_date BETWEEN ${cutoffDate} AND ${today} THEN s.active_users_date
				ELSE s.installs_date
			END AS last_data_date
		FROM projects p
		INNER JOIN public_project_stats s ON s.project_id = p.id
		WHERE p.visibility = 'public'
		  AND p.leaderboard_opt_in = 1
		  AND p.leaderboard_status = 'approved'
		  AND p.deleted_at IS NULL
		  AND p.moderation_status = 'active'
		  AND (
			s.active_users_date BETWEEN ${cutoffDate} AND ${today}
			OR s.installs_date BETWEEN ${cutoffDate} AND ${today}
		  )
		ORDER BY growth DESC, active_users DESC, p.name ASC
	`);

	return rows.map((row) => ({
		projectId: row.project_id,
		name: row.name,
		slug: row.slug,
		category: row.category,
		shortDescription: row.short_description,
		logoPath: row.logo_path,
		websiteUrl: row.website_url,
		pricingModel: row.pricing_model,
		isOpenSource: row.is_open_source,
		rating: row.rating,
		ratingCount: row.rating_count,
		activeUsers: row.active_users,
		installs: row.installs,
		growth: row.growth,
		growthPercent: row.growth_percent,
		lastDataDate: row.last_data_date
	}));
}
