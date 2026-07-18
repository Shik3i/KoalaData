import { db } from '$lib/server/db';
import { users, projects, importBatches } from '$lib/server/db/schema';
import { count, eq, and, isNull } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Query total user counts
	const totalUsersResult = await db.select({ val: count() }).from(users);
	const activeUsersResult = await db.select({ val: count() }).from(users).where(eq(users.status, 'active'));
	const pendingUsersResult = await db.select({ val: count() }).from(users).where(eq(users.status, 'pending'));
	const bannedUsersResult = await db.select({ val: count() }).from(users).where(eq(users.status, 'banned'));

	// Query project counts (excluding soft deleted)
	const totalProjectsResult = await db.select({ val: count() }).from(projects).where(isNull(projects.deletedAt));
	const publicProjectsResult = await db
		.select({ val: count() })
		.from(projects)
		.where(and(isNull(projects.deletedAt), eq(projects.visibility, 'public')));

	// Query import counts
	const totalImportsResult = await db.select({ val: count() }).from(importBatches);
	const failedImportsResult = await db
		.select({ val: count() })
		.from(importBatches)
		.where(eq(importBatches.status, 'failed'));

	// Calculate uploads folder disk usage
	let diskUsageBytes = 0;
	try {
		const uploadDir = process.env.DATA_DIRECTORY || './data';
		const uploadsPath = path.join(uploadDir, 'uploads');
		if (fs.existsSync(uploadsPath)) {
			const files = fs.readdirSync(uploadsPath);
			for (const file of files) {
				const filePath = path.join(uploadsPath, file);
				const stat = fs.statSync(filePath);
				if (stat.isFile()) {
					diskUsageBytes += stat.size;
				}
			}
		}
	} catch (e) {
		console.error('[Admin] Error calculating disk usage:', e);
	}

	return {
		stats: {
			totalUsers: totalUsersResult[0].val,
			activeUsers: activeUsersResult[0].val,
			pendingUsers: pendingUsersResult[0].val,
			bannedUsers: bannedUsersResult[0].val,
			totalProjects: totalProjectsResult[0].val,
			publicProjects: publicProjectsResult[0].val,
			totalImports: totalImportsResult[0].val,
			failedImports: failedImportsResult[0].val,
			diskUsageBytes
		}
	};
};
