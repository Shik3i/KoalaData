import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [counts] = await db.all<{
		total_users: number; active_users: number; pending_users: number; banned_users: number;
		total_projects: number; public_projects: number; total_imports: number; failed_imports: number;
	}>(sql`
		SELECT
			(SELECT COUNT(*) FROM users) AS total_users,
			(SELECT COUNT(*) FROM users WHERE status = 'active') AS active_users,
			(SELECT COUNT(*) FROM users WHERE status = 'pending') AS pending_users,
			(SELECT COUNT(*) FROM users WHERE status = 'banned') AS banned_users,
			(SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL) AS total_projects,
			(SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL AND visibility = 'public') AS public_projects,
			(SELECT COUNT(*) FROM import_batches) AS total_imports,
			(SELECT COUNT(*) FROM import_batches WHERE status = 'failed') AS failed_imports
	`);

	// Calculate uploads folder disk usage
	let diskUsageBytes = 0;
	try {
		const uploadDir = process.env.DATA_DIRECTORY || './data';
		const uploadsPath = path.join(uploadDir, 'uploads');
		const files = await fs.readdir(uploadsPath, { withFileTypes: true });
		const sizes = await Promise.all(files
			.filter((file) => file.isFile())
			.map(async (file) => (await fs.stat(path.join(uploadsPath, file.name))).size));
		diskUsageBytes = sizes.reduce((sum, size) => sum + size, 0);
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code !== 'ENOENT') console.error('[Admin] Error calculating disk usage:', e);
	}

	return {
		stats: {
			totalUsers: counts.total_users,
			activeUsers: counts.active_users,
			pendingUsers: counts.pending_users,
			bannedUsers: counts.banned_users,
			totalProjects: counts.total_projects,
			publicProjects: counts.public_projects,
			totalImports: counts.total_imports,
			failedImports: counts.failed_imports,
			diskUsageBytes
		}
	};
};
