import { inArray } from 'drizzle-orm';
import db from './db';
import { systemSettings } from './db/schema';

export interface PublicSiteSettings {
	siteTitle: string;
	publicDiscoveryEnabled: boolean;
	publicLeaderboardsEnabled: boolean;
	registrationMode: 'open' | 'approval_required' | 'invite_only';
}

let cachedSettings: PublicSiteSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds

export async function getPublicSiteSettings(): Promise<PublicSiteSettings> {
	const now = Date.now();
	if (cachedSettings && now - cacheTimestamp < CACHE_TTL_MS) {
		return cachedSettings;
	}

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
	cachedSettings = {
		siteTitle: values.get('site_title')?.trim() || 'KoalaData',
		publicDiscoveryEnabled: values.get('public_discovery_enabled') !== 'false',
		publicLeaderboardsEnabled: values.get('public_leaderboards_enabled') !== 'false',
		registrationMode: registrationMode === 'open' || registrationMode === 'invite_only'
			? registrationMode
			: 'approval_required'
	};
	cacheTimestamp = now;
	return cachedSettings;
}

/**
 * Invalidate the settings cache so the next read fetches fresh data from the database.
 * Should be called whenever a system setting is updated.
 */
export function invalidateSettingsCache(): void {
	cachedSettings = null;
	cacheTimestamp = 0;
}
