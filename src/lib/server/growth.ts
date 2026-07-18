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

// Stale data cutoff tolerance: 14 days
const STALENESS_CUTOFF_DAYS = 14;

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
	const nowTime = Date.now();

	for (const p of list) {
		let activeUsers = 0;
		let installs = 0;
		let growth = 0;
		let growthPercent = 0;
		let hasValidData = false;

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
							const latestObs = obs[obs.length - 1];
							const latestDate = new Date(latestObs.date);

							// Enforce staleness cutoff tolerance (14 days)
							const diffStaleMs = nowTime - latestDate.getTime();
							const diffStaleDays = diffStaleMs / (1000 * 60 * 60 * 24);

							if (diffStaleDays > STALENESS_CUTOFF_DAYS) {
								console.log(`[Growth] Project ${p.name} excluded due to stale data (${Math.round(diffStaleDays)} days old).`);
								continue;
							}

							const latestVal = latestObs.value;
							activeUsers = latestVal;
							hasValidData = true;

							// Locate observation close to 30 days prior (tolerating irregular reporting intervals)
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

							// Enforce the minimum starting value of 25 for percentage-growth calculation
							if (pastVal >= 25) {
								growthPercent = (growth / pastVal) * 100;
							} else {
								growthPercent = 0;
							}
						}
					}

					// Pull Installs
					if (def.metricType === 'installs') {
						const obs = await getEffectiveObservations(src.id, def.id);
						if (obs.length > 0) {
							installs = obs[obs.length - 1].value;
							hasValidData = true;
						}
					}
				}
			}
		} catch (e) {
			console.error(`[Growth] Error compiling stats for project ID ${p.id}:`, e);
		}

		if (hasValidData) {
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
	}

	// Sort by absolute growth descending
	return items.sort((a, b) => b.growth - a.growth);
}
