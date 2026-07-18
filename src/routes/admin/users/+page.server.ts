import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq, and, like, or, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() || '';
	const roleFilter = url.searchParams.get('role')?.trim() || '';
	const statusFilter = url.searchParams.get('status')?.trim() || '';

	const conditions = [];

	// Search condition
	if (query) {
		conditions.push(
			or(
				like(users.username, `%${query}%`),
				like(users.displayName, `%${query}%`)
			)
		);
	}

	// Role filter condition
	if (roleFilter && (roleFilter === 'admin' || roleFilter === 'user')) {
		conditions.push(eq(users.role, roleFilter));
	}

	// Status filter condition
	if (statusFilter && ['pending', 'active', 'rejected', 'banned', 'deleted'].includes(statusFilter)) {
		conditions.push(eq(users.status, statusFilter));
	}

	// Build query
	let dbQuery = db.select({
		id: users.id,
		username: users.username,
		displayName: users.displayName,
		role: users.role,
		status: users.status,
		createdAt: users.createdAt
	}).from(users);

	if (conditions.length > 0) {
		dbQuery = dbQuery.where(and(...conditions)) as any;
	}

	const list = await dbQuery.orderBy(users.username).limit(100);

	return {
		users: list,
		searchQuery: query,
		roleFilter,
		statusFilter
	};
};
