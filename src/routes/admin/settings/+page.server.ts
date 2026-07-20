import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { invalidateSettingsCache } from '$lib/server/settings';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const settingsList = await db.select().from(systemSettings);
	
	// Convert array to key-value map for the UI template
	const settingsMap: Record<string, string> = {};
	for (const s of settingsList) {
		settingsMap[s.key] = s.value;
	}

	return {
		settings: settingsMap
	};
};

export const actions: Actions = {
	default: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const registrationMode = data.get('registration_mode')?.toString().trim() || 'approval_required';
		const defaultMaxProjects = data.get('default_max_projects')?.toString().trim() || '5';
		const defaultMaxStorageBytes = data.get('default_max_storage_bytes')?.toString().trim() || '26214400';
		const defaultMaxCsvSizeBytes = data.get('default_max_csv_size_bytes')?.toString().trim() || '10485760';
		const defaultMaxCsvRows = data.get('default_max_csv_rows')?.toString().trim() || '100000';
		const sessionMaxAge = data.get('session_max_age')?.toString().trim() || '2592000';
		const siteTitle = data.get('site_title')?.toString().trim() || 'KoalaData';
		const publicDiscoveryEnabled = data.get('public_discovery_enabled') === 'true' ? 'true' : 'false';
		const publicLeaderboardsEnabled = data.get('public_leaderboards_enabled') === 'true' ? 'true' : 'false';
		if (siteTitle.length < 1 || siteTitle.length > 60) {
			return fail(400, { error: 'Site Title must be between 1 and 60 characters.' });
		}

		// Validate values
		const validModes = ['open', 'invite_only', 'approval_required'];
		if (!validModes.includes(registrationMode)) {
			return fail(400, { error: 'Invalid registration mode.' });
		}

		const cleanInt = (val: string, name: string) => {
			const parsed = parseInt(val, 10);
			if (isNaN(parsed) || parsed < 1) {
				throw new Error(`${name} must be a positive integer.`);
			}
			return parsed.toString();
		};

		let cleanProjects, cleanStorage, cleanCsvSize, cleanCsvRows, cleanSessionMaxAge;
		try {
			cleanProjects = cleanInt(defaultMaxProjects, 'Default Max Projects');
			cleanStorage = cleanInt(defaultMaxStorageBytes, 'Default Max Storage Bytes');
			cleanCsvSize = cleanInt(defaultMaxCsvSizeBytes, 'Default Max CSV Size Bytes');
			cleanCsvRows = cleanInt(defaultMaxCsvRows, 'Default Max CSV Rows');
			cleanSessionMaxAge = cleanInt(sessionMaxAge, 'Session Max Age');
			if (Number(cleanSessionMaxAge) < 300) throw new Error('Session Max Age must be at least 300 seconds.');
		} catch (e: any) {
			return fail(400, { error: e.message || 'Invalid integer inputs.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		// Upsert helper inside transaction synchronously
		try {
			db.transaction((tx) => {
				const upsert = (key: string, value: string) => {
					tx
						.insert(systemSettings)
						.values({ key, value })
						.onConflictDoUpdate({
							target: systemSettings.key,
							set: { value }
						})
						.run();
				};

				upsert('registration_mode', registrationMode);
				upsert('default_max_projects', cleanProjects!);
				upsert('default_max_storage_bytes', cleanStorage!);
				upsert('default_max_csv_size_bytes', cleanCsvSize!);
				upsert('default_max_csv_rows', cleanCsvRows!);
				upsert('session_max_age', cleanSessionMaxAge!);
				upsert('site_title', siteTitle);
				upsert('public_discovery_enabled', publicDiscoveryEnabled);
				upsert('public_leaderboards_enabled', publicLeaderboardsEnabled);
			});
		} catch (e: any) {
			return fail(500, { error: `Database error: ${e.message || e}` });
		}

		invalidateSettingsCache();

		try {
			await logAuditEvent(
				locals.user.id,
				locals.user.username,
				'admin_update_settings',
				'system_settings',
				'global',
				{ registrationMode, defaultMaxProjects, defaultMaxStorageBytes },
				ip
			);
		} catch (e: any) {
			console.error('[Settings] Audit log failed:', e);
		}

		return { success: 'System settings saved successfully.' };
	}
};
