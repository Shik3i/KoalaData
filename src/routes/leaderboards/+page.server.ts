import { getLeaderboard } from '$lib/server/growth';
import type { PageServerLoad } from './$types';
import { getPublicSiteSettings } from '$lib/server/settings';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	if (!(await getPublicSiteSettings()).publicLeaderboardsEnabled) error(404, 'Leaderboards are disabled.');
	const leaderboard = await getLeaderboard();

	return {
		leaderboard
	};
};
