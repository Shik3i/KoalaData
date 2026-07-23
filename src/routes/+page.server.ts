import { getLeaderboard } from '$lib/server/growth';
import type { PageServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';

export const load: PageServerLoad = async () => {
	const site = await getPublicSiteSettings();
	const leaderboard = site.publicLeaderboardsEnabled ? await getLeaderboard() : [];

	return {
		leaderboard
	};
};
