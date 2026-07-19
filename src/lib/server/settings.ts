import { inArray } from 'drizzle-orm';
import db from './db';
import { systemSettings } from './db/schema';

export interface PublicSiteSettings {
	siteTitle: string;
	publicDiscoveryEnabled: boolean;
	publicLeaderboardsEnabled: boolean;
	registrationMode: 'open' | 'approval_required' | 'invite_only';
}

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
	const rows = await db
		.select()
		.from(systemSettings)
		.where(inArray(systemSettings.key, [
			'site_title',
			'public_discovery_enabled',
			'public_leaderboards_enabled',
			'registration_mode'
		]));
	const values = new Map(rows.map((row) => [row.key, row.value]));
	const registrationMode = values.get('registration_mode');
	return {
		siteTitle: values.get('site_title')?.trim() || 'KoalaData',
		publicDiscoveryEnabled: values.get('public_discovery_enabled') !== 'false',
		publicLeaderboardsEnabled: values.get('public_leaderboards_enabled') !== 'false',
		registrationMode: registrationMode === 'open' || registrationMode === 'invite_only'
			? registrationMode
			: 'approval_required'
	};
}
