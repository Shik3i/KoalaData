import db from './index';
import { users, systemSettings } from './schema';
import { eq, and } from 'drizzle-orm';
import { hashPassword } from '../auth';

export async function runSeeding() {
	try {
		// 1. Check if any active admin exists
		const existingAdmins = await db
			.select()
			.from(users)
			.where(and(eq(users.role, 'admin'), eq(users.status, 'active')))
			.limit(1);

		if (existingAdmins.length > 0) {
			console.log('[Seed] Database already has an active administrator. Skipping admin seeding.');
		} else {
			// Seed initial admin
			const env = process.env;
			const username = env.KOALADATA_ADMIN_USERNAME;
			const displayName = env.KOALADATA_ADMIN_DISPLAY_NAME;
			const password = env.KOALADATA_ADMIN_PASSWORD;

			const isProd = env.NODE_ENV === 'production';

			if (!username || !displayName || !password) {
				if (isProd) {
					console.error('[Seed] ERROR: No administrator exists and KOALADATA_ADMIN_USERNAME, KOALADATA_ADMIN_DISPLAY_NAME, or KOALADATA_ADMIN_PASSWORD environment variables are missing in production.');
					process.exit(1);
				} else {
					// In development, seed with insecure defaults and require password change
					console.log('[Seed] No admin credentials provided in dev environment. Seeding default dev credentials...');
					const defaultUsername = 'admin';
					const defaultDisplayName = 'Dev Admin';
					const defaultPassword = 'admin_password';

					const passHash = await hashPassword(defaultPassword);
					await db.insert(users).values({
						id: crypto.randomUUID(),
						username: defaultUsername,
						normalizedUsername: defaultUsername.toLowerCase(),
						displayName: defaultDisplayName,
						passwordHash: passHash,
						role: 'admin',
						status: 'active',
						forcePasswordChange: 1, // Require changing insecure dev password
						createdAt: Math.floor(Date.now() / 1000),
						updatedAt: Math.floor(Date.now() / 1000)
					});
					console.log(`[Seed] Seeded default administrator: ${defaultUsername} (password: ${defaultPassword}). CHANGE PASSWORD IMMEDIATELY.`);
				}
			} else {
				// Seed using env vars
				const passHash = await hashPassword(password);
				await db.insert(users).values({
					id: crypto.randomUUID(),
					username,
					normalizedUsername: username.toLowerCase(),
					displayName,
					passwordHash: passHash,
					role: 'admin',
					status: 'active',
					forcePasswordChange: 1, // Require change of the seeded password on first login
					createdAt: Math.floor(Date.now() / 1000),
					updatedAt: Math.floor(Date.now() / 1000)
				});
				console.log(`[Seed] Seeded administrator from environment variables: ${username}`);
			}
		}

		// 2. Seed default system settings if they do not exist
		const defaultSettings = [
			{ key: 'registration_mode', value: 'approval_required' },
			{ key: 'default_max_projects', value: '5' },
			{ key: 'default_max_storage_bytes', value: '26214400' }, // 25 MB
			{ key: 'default_max_csv_size_bytes', value: '10485760' }, // 10 MB
			{ key: 'default_max_csv_rows', value: '100000' },
			{ key: 'session_max_age', value: '2592000' }, // 30 days
			{ key: 'site_title', value: 'KoalaData' },
			{ key: 'public_discovery_enabled', value: 'true' },
			{ key: 'public_leaderboards_enabled', value: 'true' }
		];

		for (const setting of defaultSettings) {
			const existing = await db
				.select()
				.from(systemSettings)
				.where(eq(systemSettings.key, setting.key))
				.limit(1);

			if (existing.length === 0) {
				await db.insert(systemSettings).values(setting);
				console.log(`[Seed] Seeded default system setting: ${setting.key} = ${setting.value}`);
			}
		}
	} catch (error) {
		console.error('[Seed] Database seeding failed:', error);
		process.exit(1);
	}
}
