import db from './db';
import { users, sessions } from './db/schema';
import { eq, and, ne, isNull } from 'drizzle-orm';
import { hashPassword, invalidateUserSessions } from './auth';
import { logAuditEvent } from './audit';
import { isSqliteUniqueConstraint } from './db/errors';

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

/**
 * Validate username format and reserved names.
 */
export function validateUsername(username: string): void {
	if (username.length < 3 || username.length > 30) {
		throw new Error('Username must be between 3 and 30 characters.');
	}

	const usernameRegex = /^[a-zA-Z0-9_.-]+$/;
	if (!usernameRegex.test(username)) {
		throw new Error('Username can only contain letters, numbers, underscores, hyphens, and dots.');
	}

	const normalized = username.toLowerCase();
	if (RESERVED_USERNAMES.has(normalized)) {
		throw new Error('Username is a reserved system path.');
	}
}

/**
 * Helper to ensure we do not disable the final active administrator.
 */
async function assertNotLastActiveAdmin(targetUserId: string) {
	const activeAdmins = await db
		.select()
		.from(users)
		.where(
			and(
				eq(users.role, 'admin'),
				eq(users.status, 'active'),
				isNull(users.deletedAt),
				ne(users.id, targetUserId)
			)
		);

	if (activeAdmins.length === 0) {
		throw new Error('Operation blocked: Cannot demote, ban, or delete the final remaining active administrator.');
	}
}

/**
 * Register a user programmatically with full business checks.
 */
export async function registerUser(
	username: string,
	password: string,
	mode: 'open' | 'approval_required' | 'invite_only',
	actorIp = '127.0.0.1'
): Promise<string> {
	if (mode === 'invite_only') {
		throw new Error('Registration is currently closed.');
	}

	validateUsername(username);

	if (password.length < 8) {
		throw new Error('Password must be at least 8 characters long.');
	}

	const normalized = username.toLowerCase();

	const existing = await db
		.select()
		.from(users)
		.where(eq(users.normalizedUsername, normalized))
		.limit(1);

	if (existing.length > 0) {
		throw new Error('Username is already taken.');
	}

	const userId = crypto.randomUUID();
	const status = mode === 'open' ? 'active' : 'pending';
	const passwordHash = await hashPassword(password);

	try {
		await db.insert(users).values({
			id: userId,
			username,
			normalizedUsername: normalized,
			displayName: username,
			passwordHash,
			role: 'user',
			status,
			createdAt: Math.floor(Date.now() / 1000),
			updatedAt: Math.floor(Date.now() / 1000)
		});
	} catch (error) {
		if (isSqliteUniqueConstraint(error)) throw new Error('Username is already taken.');
		throw error;
	}

	await logAuditEvent(
		userId,
		username,
		'register',
		'user',
		userId,
		{ status },
		actorIp
	);

	return userId;
}

/**
 * Approve a pending user account.
 */
export async function approveUser(adminId: string, adminUsername: string, targetUserId: string, actorIp = '127.0.0.1') {
	const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');
	if (user[0].status !== 'pending') throw new Error('User is not pending approval.');

	await db
		.update(users)
		.set({
			status: 'active',
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(users.id, targetUserId));

	await logAuditEvent(adminId, adminUsername, 'approve_user', 'user', targetUserId, {}, actorIp);
}

/**
 * Reject a pending user account.
 */
export async function rejectUser(adminId: string, adminUsername: string, targetUserId: string, actorIp = '127.0.0.1') {
	const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');
	if (user[0].status !== 'pending') throw new Error('User is not pending approval.');

	await db
		.update(users)
		.set({
			status: 'rejected',
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(users.id, targetUserId));

	await logAuditEvent(adminId, adminUsername, 'reject_user', 'user', targetUserId, {}, actorIp);
}

/**
 * Ban an active user account. Banned users have all active sessions revoked immediately.
 */
export async function banUser(adminId: string, adminUsername: string, targetUserId: string, actorIp = '127.0.0.1') {
	const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');
	
	// Prevent banning the last admin
	if (user[0].role === 'admin' && user[0].status === 'active') {
		await assertNotLastActiveAdmin(targetUserId);
	}

	await db
		.update(users)
		.set({
			status: 'banned',
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(users.id, targetUserId));

	// Revoke sessions immediately
	await invalidateUserSessions(targetUserId);

	await logAuditEvent(adminId, adminUsername, 'ban_user', 'user', targetUserId, {}, actorIp);
}

/**
 * Unban a banned user account, restoring them to active.
 */
export async function unbanUser(adminId: string, adminUsername: string, targetUserId: string, actorIp = '127.0.0.1') {
	const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');
	if (user[0].status !== 'banned') throw new Error('User is not banned.');

	await db
		.update(users)
		.set({
			status: 'active',
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(users.id, targetUserId));

	await logAuditEvent(adminId, adminUsername, 'unban_user', 'user', targetUserId, {}, actorIp);
}

/**
 * Promote a user to administrator.
 */
export async function promoteUser(adminId: string, adminUsername: string, targetUserId: string, actorIp = '127.0.0.1') {
	const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');
	if (user[0].role === 'admin') throw new Error('User is already an admin.');

	await db
		.update(users)
		.set({
			role: 'admin',
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(users.id, targetUserId));

	await logAuditEvent(adminId, adminUsername, 'promote_user', 'user', targetUserId, {}, actorIp);
}

/**
 * Demote an administrator to a standard user.
 */
export async function demoteUser(adminId: string, adminUsername: string, targetUserId: string, actorIp = '127.0.0.1') {
	const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');
	if (user[0].role !== 'admin') throw new Error('User is not an admin.');

	// Prevent demoting the last active admin
	await assertNotLastActiveAdmin(targetUserId);

	await db
		.update(users)
		.set({
			role: 'user',
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(users.id, targetUserId));

	await logAuditEvent(adminId, adminUsername, 'demote_user', 'user', targetUserId, {}, actorIp);
}

/**
 * Soft delete a user account.
 */
export async function deleteUser(adminId: string, adminUsername: string, targetUserId: string, actorIp = '127.0.0.1') {
	const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');

	if (user[0].role === 'admin' && user[0].status === 'active') {
		await assertNotLastActiveAdmin(targetUserId);
	}

	const now = Math.floor(Date.now() / 1000);
	await db
		.update(users)
		.set({
			status: 'deleted',
			deletedAt: now,
			updatedAt: now
		})
		.where(eq(users.id, targetUserId));

	// Revoke sessions immediately
	await invalidateUserSessions(targetUserId);

	await logAuditEvent(adminId, adminUsername, 'delete_user', 'user', targetUserId, {}, actorIp);
}

/**
 * Restore a soft-deleted user account.
 */
export async function restoreUser(adminId: string, adminUsername: string, targetUserId: string, actorIp = '127.0.0.1') {
	const user = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');
	if (user[0].status !== 'deleted') throw new Error('User is not deleted.');

	await db
		.update(users)
		.set({
			status: 'active',
			deletedAt: null,
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(users.id, targetUserId));

	await logAuditEvent(adminId, adminUsername, 'restore_user', 'user', targetUserId, {}, actorIp);
}

/**
 * Reset a user's password and optionally require password change. Revokes other sessions.
 */
export async function resetUserPassword(
	adminId: string,
	adminUsername: string,
	targetUserId: string,
	newPassword: string,
	forceChange: boolean,
	actorIp = '127.0.0.1'
) {
	if (newPassword.length < 8) {
		throw new Error('Password must be at least 8 characters long.');
	}
	const user = await db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
	if (user.length === 0) throw new Error('User not found.');

	const hash = await hashPassword(newPassword);

	await db
		.update(users)
		.set({
			passwordHash: hash,
			forcePasswordChange: forceChange ? 1 : 0,
			updatedAt: Math.floor(Date.now() / 1000)
		})
		.where(eq(users.id, targetUserId));

	// Revoke active sessions so they must log in with new password
	await invalidateUserSessions(targetUserId);

	await logAuditEvent(adminId, adminUsername, 'reset_password', 'user', targetUserId, { forceChange }, actorIp);
}
