import { db } from '$lib/server/db';
import { users, systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth';
import { logAuditEvent } from '$lib/server/audit';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Reserved usernames blacklist
const RESERVED_USERNAMES = new Set([
	'admin',
	'administrator',
	'root',
	'system',
	'api',
	'login',
	'register',
	'settings',
	'projects',
	'leaderboard',
	'koaladata'
]);

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
		const displayName = data.get('displayName')?.toString().trim() || '';
		const password = data.get('password')?.toString() || '';

		// 1. Fetch registration mode
		const modeSetting = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.key, 'registration_mode'))
			.limit(1);

		const mode = modeSetting[0]?.value || 'approval_required';

		if (mode === 'closed') {
			return fail(400, { error: 'Registration is currently closed.' });
		}

		// 2. Validate Username
		if (username.length < 3 || username.length > 30) {
			return fail(400, { error: 'Username must be between 3 and 30 characters.' });
		}

		const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
		if (!usernameRegex.test(username)) {
			return fail(400, { error: 'Username can only contain letters, numbers, underscores, hyphens, and dots.' });
		}

		const normalized = username.toLowerCase();
		if (RESERVED_USERNAMES.has(normalized)) {
			return fail(400, { error: 'This username is reserved.' });
		}

		// Check normalized username uniqueness
		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.normalizedUsername, normalized))
			.limit(1);

		if (existingUser.length > 0) {
			return fail(400, { error: 'Username is already taken.' });
		}

		// 3. Validate Display Name
		if (displayName.length < 1 || displayName.length > 50) {
			return fail(400, { error: 'Display name must be between 1 and 50 characters.' });
		}

		// 4. Validate Password
		if (password.length < 8) {
			return fail(400, { error: 'Password must be at least 8 characters long.' });
		}

		// 5. Hash Password & Create User
		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		const passwordHash = await hashPassword(password);
		const userId = crypto.randomUUID();
		const status = mode === 'open' ? 'active' : 'pending';

		await db.insert(users).values({
			id: userId,
			username,
			normalizedUsername: normalized,
			displayName,
			passwordHash,
			role: 'user',
			status,
			createdAt: Math.floor(Date.now() / 1000),
			updatedAt: Math.floor(Date.now() / 1000)
		});

		// Write Audit Log
		await logAuditEvent(
			userId,
			username,
			'register',
			'user',
			userId,
			{ status },
			clientIp
		);

		if (status === 'pending') {
			throw redirect(302, '/login?success=pending');
		} else {
			throw redirect(302, '/login?success=registered');
		}
	}
};
