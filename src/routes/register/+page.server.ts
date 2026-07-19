import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { registerUser } from '$lib/server/users';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If already logged in, redirect to dashboard
	if (locals.user) {
		throw redirect(302, '/app');
	}

	// Fetch current registration mode
	const modeSetting = await db
		.select()
		.from(systemSettings)
		.where(eq(systemSettings.key, 'registration_mode'))
		.limit(1);

	const mode = modeSetting[0]?.value || 'approval_required';

	return {
		registrationMode: mode
	};
};

export const actions: Actions = {
	default: async ({ request, getClientAddress }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim() || '';
		const password = data.get('password')?.toString() || '';

		// 1. Fetch registration mode
		const modeSetting = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.key, 'registration_mode'))
			.limit(1);

		const mode = modeSetting[0]?.value || 'approval_required';

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		try {
			if (!['open', 'approval_required', 'invite_only'].includes(mode)) {
				return fail(500, { error: 'Registration policy is misconfigured.' });
			}
			await registerUser(username, password, mode as 'open' | 'approval_required' | 'invite_only', clientIp);
		} catch (error) {
			return fail(400, { error: error instanceof Error ? error.message : 'Registration failed.' });
		}

		if (mode === 'approval_required') {
			throw redirect(302, '/login?success=pending');
		} else {
			throw redirect(302, '/login?success=registered');
		}
	}
};
