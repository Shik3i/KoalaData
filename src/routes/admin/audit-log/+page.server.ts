import { db } from '$lib/server/db';
import { auditLogs, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Query security logs in descending chronological order
	const list = await db
		.select({
			id: auditLogs.id,
			userId: auditLogs.userId,
			actorUsername: auditLogs.actorUsername,
			action: auditLogs.action,
			targetType: auditLogs.targetType,
			targetId: auditLogs.targetId,
			payload: auditLogs.payload,
			ipAddress: auditLogs.ipAddress,
			createdAt: auditLogs.createdAt
		})
		.from(auditLogs)
		.orderBy(auditLogs.createdAt)
		.limit(100);

	return {
		logs: list
	};
};
