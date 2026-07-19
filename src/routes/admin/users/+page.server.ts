import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq, and, like, count, type SQL } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const page = Math.max(1, Number.parseInt(url.searchParams.get('page') || '1', 10) || 1);
	const pageSize = 50;
	const query = url.searchParams.get('q')?.trim() || '';
	const roleFilter = url.searchParams.get('role')?.trim() || '';
	const statusFilter = url.searchParams.get('status')?.trim() || '';

	const conditions: SQL<unknown>[] = [];

	// Search condition
	if (query) {
		conditions.push(
			like(users.username, `%${query}%`)
		);
	}

	// Role filter condition
	if (roleFilter && (roleFilter === 'admin' || roleFilter === 'user')) {
		conditions.push(eq(users.role, roleFilter));
	}

	// Status filter condition
	if (statusFilter && ['pending', 'active', 'rejected', 'banned', 'deleted'].includes(statusFilter)) {
		conditions.push(eq(users.status, statusFilter as any));
	}

	const where = conditions.length > 0 ? and(...conditions) : undefined;
	const list = await db.select({
		id: users.id,
		username: users.username,
		role: users.role,
		status: users.status,
		createdAt: users.createdAt
	}).from(users).where(where).orderBy(users.username).limit(pageSize).offset((page - 1) * pageSize);
	const totalResult = await db.select({ value: count() }).from(users).where(where);
	const total = totalResult[0]?.value ?? 0;

	return {
		users: list,
		searchQuery: query,
		roleFilter,
		statusFilter,
		pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
	};
};
