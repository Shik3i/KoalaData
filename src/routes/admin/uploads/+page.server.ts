import { db } from '$lib/server/db';
import { importBatches, users, projects } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Fetch all imports in the system, joined with user and project details
	const list = await db
		.select({
			id: importBatches.id,
			originalFilename: importBatches.originalFilename,
			fileSize: importBatches.fileSize,
			rowCount: importBatches.rowCount,
			warningCount: importBatches.warningCount,
			errorCount: importBatches.errorCount,
			status: importBatches.status,
			errorMessage: importBatches.errorMessage,
			createdAt: importBatches.createdAt,
			revertedAt: importBatches.revertedAt,
			username: users.username,
			projectName: projects.name,
			projectId: projects.id
		})
		.from(importBatches)
		.innerJoin(users, eq(importBatches.userId, users.id))
		.innerJoin(projects, eq(importBatches.projectId, projects.id))
		.orderBy(importBatches.createdAt);

	return {
		imports: list
	};
};
