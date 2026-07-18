import db from './db';
import { systemSettings, userLimitOverrides, projects, importBatches } from './db/schema';
import { eq, and, isNull, sum, count, ne } from 'drizzle-orm';

/**
 * Fetch and merge user limit overrides with system defaults.
 * Also returns the user's current project and storage usage.
 */
export async function getUserLimits(userId: string) {
	// 1. Fetch system defaults
	const settingsList = await db.select().from(systemSettings);
	const defaults = {
		maxProjects: 5,
		maxStorageBytes: 25 * 1024 * 1024,
		maxCsvSizeBytes: 10 * 1024 * 1024,
		maxCsvRows: 100000
	};

	for (const s of settingsList) {
		if (s.key === 'default_max_projects') defaults.maxProjects = parseInt(s.value, 10);
		if (s.key === 'default_max_storage_bytes') defaults.maxStorageBytes = parseInt(s.value, 10);
		if (s.key === 'default_max_csv_size_bytes') defaults.maxCsvSizeBytes = parseInt(s.value, 10);
		if (s.key === 'default_max_csv_rows') defaults.maxCsvRows = parseInt(s.value, 10);
	}

	// 2. Fetch user overrides
	const overrides = await db
		.select()
		.from(userLimitOverrides)
		.where(eq(userLimitOverrides.userId, userId))
		.limit(1);
	const userOverride = overrides[0] || {};

	const limits = {
		maxProjects: userOverride.maxProjects ?? defaults.maxProjects,
		maxStorageBytes: userOverride.maxStorageBytes ?? defaults.maxStorageBytes,
		maxCsvSizeBytes: userOverride.maxCsvSizeBytes ?? defaults.maxCsvSizeBytes,
		maxCsvRows: userOverride.maxCsvRows ?? defaults.maxCsvRows
	};

	// 3. Query current project usage
	const projectsCount = await db
		.select({ val: count() })
		.from(projects)
		.where(and(eq(projects.ownerId, userId), isNull(projects.deletedAt)));
	const currentProjectsCount = projectsCount[0]?.val || 0;

	// 4. Query current storage usage (active CSV file sizes uploaded by this user)
	const storageSum = await db
		.select({ val: sum(importBatches.fileSize) })
		.from(importBatches)
		.where(
			and(
				eq(importBatches.userId, userId),
				isNull(importBatches.rawFileDeletedAt),
				ne(importBatches.status, 'failed')
			)
		);
	
	const currentStorageBytes = Number(storageSum[0]?.val || 0);

	return {
		limits,
		usage: {
			projectsCount: currentProjectsCount,
			storageBytes: currentStorageBytes
		}
	};
}
