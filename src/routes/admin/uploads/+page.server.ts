import { db } from '$lib/server/db';
import { importBatches, users, projects } from '$lib/server/db/schema';
import { count, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 100;

export const load: PageServerLoad = async ({ url }) => {
	const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
	const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
	const [list, total] = await Promise.all([db
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
		.orderBy(desc(importBatches.createdAt))
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE),
		db.select({ value: count() }).from(importBatches)
	]);

	return {
		imports: list,
		page,
		pages: Math.max(1, Math.ceil(total[0].value / PAGE_SIZE))
	};
};
