import { db } from '$lib/server/db';
import { users, projects, sessions, userLimitOverrides } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import {
	approveUser,
	rejectUser,
	banUser,
	unbanUser,
	promoteUser,
	demoteUser,
	deleteUser,
	restoreUser,
	resetUserPassword
} from '$lib/server/users';
import { invalidateSession, invalidateUserSessions } from '$lib/server/auth';
import { logAuditEvent } from '$lib/server/audit';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const userId = params.id;

	// Fetch user details
	const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (userRecord.length === 0) {
		throw redirect(302, '/admin/users?error=user_not_found');
	}

	const user = userRecord[0];

	// Fetch projects owned by this user
	const userProjects = await db
		.select()
		.from(projects)
		.where(and(eq(projects.ownerId, userId), isNull(projects.deletedAt)));

	// Fetch active sessions for this user
	const activeSessions = await db.select().from(sessions).where(eq(sessions.userId, userId));

	// Fetch limit overrides
	const limitsRecord = await db.select().from(userLimitOverrides).where(eq(userLimitOverrides.userId, userId)).limit(1);
	const limits = limitsRecord[0] || null;

	return {
		targetUser: {
			id: user.id,
			username: user.username,
			role: user.role,
			status: user.status,
			forcePasswordChange: user.forcePasswordChange,
			createdAt: user.createdAt,
			deletedAt: user.deletedAt
		},
		projects: userProjects,
		sessions: activeSessions,
		limits
	};
};

export const actions: Actions = {
	approve: async ({ params, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await approveUser(locals.user.id, locals.user.username, params.id, ip);
			return { success: 'User approved.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	reject: async ({ params, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await rejectUser(locals.user.id, locals.user.username, params.id, ip);
			return { success: 'User rejected.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	ban: async ({ params, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await banUser(locals.user.id, locals.user.username, params.id, ip);
			return { success: 'User banned and all active sessions revoked.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	unban: async ({ params, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await unbanUser(locals.user.id, locals.user.username, params.id, ip);
			return { success: 'User unbanned.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	promote: async ({ params, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await promoteUser(locals.user.id, locals.user.username, params.id, ip);
			return { success: 'User promoted to administrator.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	demote: async ({ params, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await demoteUser(locals.user.id, locals.user.username, params.id, ip);
			return { success: 'Administrator demoted to user.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	delete: async ({ params, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await deleteUser(locals.user.id, locals.user.username, params.id, ip);
			return { success: 'User soft deleted and sessions revoked.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	restore: async ({ params, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await restoreUser(locals.user.id, locals.user.username, params.id, ip);
			return { success: 'User account restored.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	resetPassword: async ({ params, request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const data = await request.formData();
		const newPassword = data.get('newPassword')?.toString() || '';
		const forceChange = data.get('forceChange')?.toString() === 'true';

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			await resetUserPassword(locals.user.id, locals.user.username, params.id, newPassword, forceChange, ip);
			return { success: 'Password reset successfully. Sessions revoked.' };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	},

	revokeSession: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const data = await request.formData();
		const sessionHash = data.get('sessionHash')?.toString() || '';

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		await invalidateSession(sessionHash);
		await logAuditEvent(locals.user.id, locals.user.username, 'admin_revoke_session', 'session', sessionHash, {}, ip);

		return { success: 'Session revoked.' };
	},

	saveLimits: async ({ params, request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') return fail(403);
		const data = await request.formData();
		const optionalPositiveInteger = (key: string): number | null => {
			const raw = data.get(key)?.toString().trim() || '';
			if (!raw) return null;
			const value = Number(raw);
			if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${key} must be a positive integer.`);
			return value;
		};
		let maxProjects: number | null;
		let maxStorageBytes: number | null;
		let maxCsvSizeBytes: number | null;
		let maxCsvRows: number | null;
		try {
			maxProjects = optionalPositiveInteger('maxProjects');
			maxStorageBytes = optionalPositiveInteger('maxStorageBytes');
			maxCsvSizeBytes = optionalPositiveInteger('maxCsvSizeBytes');
			maxCsvRows = optionalPositiveInteger('maxCsvRows');
		} catch (error) {
			return fail(400, { error: error instanceof Error ? error.message : 'Invalid limit override.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		// Insert or update limit overrides
		const existingOverride = await db
			.select()
			.from(userLimitOverrides)
			.where(eq(userLimitOverrides.userId, params.id))
			.limit(1);

		const limitValues = {
			maxProjects,
			maxStorageBytes,
			maxCsvSizeBytes,
			maxCsvRows
		};

		if (existingOverride.length > 0) {
			await db.update(userLimitOverrides).set(limitValues).where(eq(userLimitOverrides.userId, params.id));
		} else {
			await db.insert(userLimitOverrides).values({
				userId: params.id,
				...limitValues
			});
		}

		await logAuditEvent(locals.user.id, locals.user.username, 'admin_update_limits', 'user', params.id, limitValues, ip);

		return { success: 'Limit overrides saved.' };
	}
};
