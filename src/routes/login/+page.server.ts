import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword, generateSessionToken, createSession, invalidateSession } from '$lib/server/auth';
import { logAuditEvent } from '$lib/server/audit';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Redirect to dashboard if already logged in
	if (locals.user) {
		throw redirect(302, '/app');
	}

	const error = url.searchParams.get('error');
	const success = url.searchParams.get('success');

	let errorMessage = '';
	let successMessage = '';

	if (error === 'pending_approval') {
		errorMessage = 'Your account is pending administrator approval.';
	} else if (error === 'admin_required') {
		errorMessage = 'Administrator access is required to view that page.';
	}

	if (success === 'pending') {
		successMessage = 'Registration successful! Your account is pending administrator approval.';
	} else if (success === 'registered') {
		successMessage = 'Registration successful! You can now log in.';
	}

	return {
		errorMessage,
		successMessage
	};
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress }) => {
		const data = await request.formData();
		const username = data.get('username')?.toString().trim() || '';
		const password = data.get('password')?.toString() || '';
		const redirectTo = data.get('redirectTo')?.toString() || '/app';

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		// 1. Fetch user by normalized username
		const normalized = username.toLowerCase();
		const userList = await db
			.select()
			.from(users)
			.where(eq(users.normalizedUsername, normalized))
			.limit(1);

		if (userList.length === 0) {
			// Generic error to prevent enumeration
			await logAuditEvent(null, username, 'login_failure', 'user', 'none', { reason: 'user_not_found' }, clientIp);
			return fail(400, { error: 'Invalid username or password.' });
		}

		const user = userList[0];

		// 2. Verify Password
		const isValid = await verifyPassword(password, user.passwordHash);
		if (!isValid) {
			await logAuditEvent(user.id, user.username, 'login_failure', 'user', user.id, { reason: 'invalid_password' }, clientIp);
			return fail(400, { error: 'Invalid username or password.' });
		}

		// Check status: pending users cannot log in
		if (user.status === 'pending') {
			await logAuditEvent(user.id, user.username, 'login_blocked_pending', 'user', user.id, {}, clientIp);
			return fail(400, { error: 'Your account is pending administrator approval.' });
		}

		// Check status: banned, deleted or rejected users cannot log in
		if (user.status === 'banned') {
			await logAuditEvent(user.id, user.username, 'login_failure', 'user', user.id, { reason: 'account_banned', status: user.status }, clientIp);
			return fail(400, { error: 'Your account has been banned.' });
		}
		if (user.status === 'deleted' || user.status === 'rejected') {
			await logAuditEvent(user.id, user.username, 'login_failure', 'user', user.id, { reason: 'account_disabled', status: user.status }, clientIp);
			return fail(400, { error: 'Your account is disabled.' });
		}

		// 3. Create Session
		const token = generateSessionToken();
		await createSession(token, user.id, clientIp, request.headers.get('user-agent'));

		// Set Session Cookie
		const isProd = process.env.NODE_ENV === 'production';
		const isTest = process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test';
		cookies.set('session', token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: isProd && !isTest,
			maxAge: 30 * 24 * 60 * 60 // 30 days
		});

		// Audit Log
		await logAuditEvent(user.id, user.username, 'login_success', 'user', user.id, {}, clientIp);

		// Redirect to dashboard or return url
		throw redirect(302, redirectTo);
	},

	logout: async ({ cookies, locals, getClientAddress }) => {
		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		const session = locals.session;
		const user = locals.user;

		if (session) {
			await invalidateSession(session.id);
			cookies.delete('session', { path: '/' });
		}

		if (user) {
			await logAuditEvent(user.id, user.username, 'logout', 'user', user.id, {}, clientIp);
		}

		throw redirect(302, '/login');
	}
};
