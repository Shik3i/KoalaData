import { db } from '$lib/server/db';
import { auditLogs } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { count } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const totalResult = await db.select({ value: count() }).from(auditLogs);
	const total = totalResult[0]?.value ?? 0;
	// Query security logs in descending chronological order
	const list = await db
		.select({
			id: auditLogs.id,
			userId: auditLogs.actorId,
			actorUsername: auditLogs.actorUsername,
			action: auditLogs.action,
			targetType: auditLogs.targetType,
			targetId: auditLogs.targetId,
			payload: auditLogs.metadata,
			ipAddress: auditLogs.ipAddress,
			createdAt: auditLogs.timestamp
		})
		.from(auditLogs)
		.orderBy(desc(auditLogs.timestamp))
		.limit(PAGE_SIZE)
		.offset((page - 1) * PAGE_SIZE);

	return {
		logs: list,
		pagination: { page, pageSize: PAGE_SIZE, total, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
	};
};
