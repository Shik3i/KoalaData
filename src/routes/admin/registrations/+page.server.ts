import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { approveUser, rejectUser } from '$lib/server/users';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Fetch all pending users ordered by registration date
	const pendingUsers = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName,
			createdAt: users.createdAt
		})
		.from(users)
		.where(eq(users.status, 'pending'))
		.orderBy(users.createdAt);

	return {
		pendingUsers
	};
};

export const actions: Actions = {
	approve: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const userId = data.get('userId')?.toString() || '';

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		try {
			await approveUser(locals.user.id, locals.user.username, userId, clientIp);
			return { success: 'User registration approved successfully.' };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Approval failed.' });
		}
	},

	reject: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const userId = data.get('userId')?.toString() || '';

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		try {
			await rejectUser(locals.user.id, locals.user.username, userId, clientIp);
			return { success: 'User registration rejected.' };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Rejection failed.' });
		}
	}
};
