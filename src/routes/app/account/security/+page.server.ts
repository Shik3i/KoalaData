import { db } from '$lib/server/db';
import { sessions, users } from '$lib/server/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { hashPassword, verifyPassword, invalidateSession, invalidateUserSessions, hashSessionToken } from '$lib/server/auth';
import { logAuditEvent } from '$lib/server/audit';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const rawToken = cookies.get('session') || '';
	const currentSessionHash = hashSessionToken(rawToken);

	// Fetch active sessions for the user
	const activeSessions = await db
		.select()
		.from(sessions)
		.where(eq(sessions.userId, locals.user.id));

	return {
		user: locals.user,
		currentSessionHash,
		sessions: activeSessions.map((s) => ({
			id: s.id,
			createdAt: s.createdAt,
			lastUsedAt: s.lastUsedAt,
			ipAddress: s.ipAddress,
			userAgent: s.userAgent,
			isCurrent: s.id === currentSessionHash
		}))
	};
};

export const actions: Actions = {
	changePassword: async ({ request, locals, cookies, getClientAddress }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const oldPassword = data.get('oldPassword')?.toString() || '';
		const newPassword = data.get('newPassword')?.toString() || '';

		if (newPassword.length < 8) {
			return fail(400, { error: 'New password must be at least 8 characters long.' });
		}

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		// 1. Fetch current user from DB
		const userList = await db
			.select()
			.from(users)
			.where(eq(users.id, locals.user.id))
			.limit(1);

		if (userList.length === 0) {
			return fail(400, { error: 'User not found.' });
		}

		const user = userList[0];

		// 2. Verify old password
		const isOldValid = await verifyPassword(oldPassword, user.passwordHash);
		if (!isOldValid) {
			return fail(400, { error: 'Incorrect current password.' });
		}

		// 3. Hash new password & update
		const newHash = await hashPassword(newPassword);
		await db
			.update(users)
			.set({
				passwordHash: newHash,
				forcePasswordChange: 0, // Clear force password change
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(eq(users.id, locals.user.id));

		// 4. Revoke other sessions (keep only current one)
		await db
			.delete(sessions)
			.where(
				and(
					eq(sessions.userId, locals.user.id),
					ne(sessions.id, locals.session.id)
				)
			);

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'change_password',
			'user',
			locals.user.id,
			{ other_sessions_revoked: true },
			clientIp
		);

		return { success: 'Password changed successfully. All other sessions have been logged out.' };
	},

	revokeSession: async ({ request, locals, cookies, getClientAddress }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		const data = await request.formData();
		const sessionHash = data.get('sessionHash')?.toString() || '';

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		// Verify session belongs to the user
		const sessionRecord = await db
			.select()
			.from(sessions)
			.where(and(eq(sessions.id, sessionHash), eq(sessions.userId, locals.user.id)))
			.limit(1);

		if (sessionRecord.length === 0) {
			return fail(400, { error: 'Session not found.' });
		}

		// Revoke
		await invalidateSession(sessionHash);

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'revoke_session',
			'session',
			sessionHash,
			{ is_current: sessionHash === locals.session.id },
			clientIp
		);

		// If current session revoked, log out
		if (sessionHash === locals.session.id) {
			cookies.delete('session', { path: '/' });
			throw redirect(302, '/login');
		}

		return { success: 'Session revoked.' };
	},

	revokeAllSessions: async ({ locals, cookies, getClientAddress }) => {
		if (!locals.user || !locals.session) {
			return fail(401, { error: 'Unauthorized' });
		}

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		// Delete all sessions except current
		await db
			.delete(sessions)
			.where(
				and(
					eq(sessions.userId, locals.user.id),
					ne(sessions.id, locals.session.id)
				)
			);

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'revoke_all_sessions_except_current',
			'user',
			locals.user.id,
			{},
			clientIp
		);

		return { success: 'All other sessions revoked.' };
	}
};
