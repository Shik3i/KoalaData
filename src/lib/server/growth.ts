import db from './db';
import { projects, dataSources, metricDefinitions } from './db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getEffectiveObservations } from './observations';

export interface ProjectLeaderboardItem {
	projectId: string;
	name: string;
	slug: string;
	category: string;
	shortDescription: string;
	logoPath: string | null;
	activeUsers: number;
	installs: number;
	growth: number;
	growthPercent: number;
}

/**
 * Computes growth metrics and stats for opted-in and approved public projects.
 * Calculates WAUs and growth values over the last 30 days.
 * Results are returned sorted by absolute growth DESC.
 */
export async function getLeaderboard(): Promise<ProjectLeaderboardItem[]> {
	// Fetch active, public, leaderboard-approved projects
	const list = await db
		.select()
		.from(projects)
		.where(
			and(
				eq(projects.visibility, 'public'),
				eq(projects.leaderboardOptIn, 1),
				eq(projects.leaderboardStatus, 'approved'),
				isNull(projects.deletedAt),
				eq(projects.moderationStatus, 'active')
			)
		);

	const items: ProjectLeaderboardItem[] = [];

	for (const p of list) {
		let activeUsers = 0;
		let installs = 0;
		let growth = 0;
		let growthPercent = 0;

		try {
			const sources = await db
				.select()
				.from(dataSources)
				.where(eq(dataSources.projectId, p.id));

			for (const src of sources) {
				const definitions = await db
					.select()
					.from(metricDefinitions)
					.where(eq(metricDefinitions.sourceId, src.id));

				for (const def of definitions) {
					// Pull Weekly Active Users
					if (def.metricType === 'active_users') {
						const obs = await getEffectiveObservations(src.id, def.id);
						if (obs.length > 0) {
							const latestVal = obs[obs.length - 1].value;
							activeUsers = latestVal;

							// Locate observation close to 30 days prior
							const latestDate = new Date(obs[obs.length - 1].date);
							let pastVal = obs[0].value;

							for (let i = obs.length - 1; i >= 0; i--) {
								const obsDate = new Date(obs[i].date);
								const diffDays = Math.round((latestDate.getTime() - obsDate.getTime()) / (1000 * 60 * 60 * 24));
								if (diffDays >= 30) {
									pastVal = obs[i].value;
									break;
								}
							}

							growth = latestVal - pastVal;
							growthPercent = pastVal > 0 ? (growth / pastVal) * 100 : 0;
						}
					}

					// Pull Installs
					if (def.metricType === 'installs') {
						const obs = await getEffectiveObservations(src.id, def.id);
						if (obs.length > 0) {
							installs = obs[obs.length - 1].value;
						}
					}
				}
			}
		} catch (e) {
			console.error(`[Growth] Error compiling stats for project ID ${p.id}:`, e);
		}

		items.push({
			projectId: p.id,
			name: p.name,
			slug: p.slug,
			category: p.category,
			shortDescription: p.shortDescription,
			logoPath: p.logoPath,
			activeUsers,
			installs,
			growth,
			growthPercent
		});
	}

	// Sort by absolute growth descending
	return items.sort((a, b) => b.growth - a.growth);
}
