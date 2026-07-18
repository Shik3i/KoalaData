import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Authentication is enforced in hooks, but let's assert it for typing
	if (!locals.user) {
		throw fail(401);
	}

	return {
		user: locals.user
	};
};

export const actions: Actions = {
	updateProfile: async ({ request, locals, getClientAddress }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const displayName = data.get('displayName')?.toString().trim() || '';

		if (displayName.length < 1 || displayName.length > 50) {
			return fail(400, { error: 'Display name must be between 1 and 50 characters.' });
		}

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		await db
			.update(users)
			.set({
				displayName,
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(eq(users.id, locals.user.id));

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'update_display_name',
			'user',
			locals.user.id,
			{ displayName },
			clientIp
		);

		return { success: 'Profile updated successfully.' };
	}
};
