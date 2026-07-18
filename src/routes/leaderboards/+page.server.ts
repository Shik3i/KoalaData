import { getLeaderboard } from '$lib/server/growth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const leaderboard = await getLeaderboard();

	return {
		leaderboard
	};
};
