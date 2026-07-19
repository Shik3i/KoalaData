import { describe, it, expect, beforeAll } from 'vitest';
import { db } from './db';
import { users, sessions, projects, projectMembers, dataSources, importBatches, importDrafts, metricObservations } from './db/schema';
import { eq } from 'drizzle-orm';
import { initDb } from './db/setup';
import { runSeeding } from './db/seed';
import {
	registerUser,
	approveUser,
	rejectUser,
	banUser,
	unbanUser,
	promoteUser,
	demoteUser,
	deleteUser,
	restoreUser,
	resetUserPassword
} from './users';
import { createSession, validateSession } from './auth';

describe('User Management Service', () => {
	let adminUser: typeof users.$inferSelect;

	beforeAll(async () => {
		await initDb();
		// Clear all tables in child-to-parent order to prevent foreign key constraint violations
		await db.delete(metricObservations);
		await db.delete(importBatches);
		await db.delete(importDrafts);
		await db.delete(projectMembers);
		await db.delete(dataSources);
		await db.delete(projects);
		await db.delete(sessions);
		await db.delete(users);
		await runSeeding();

		// Find seeded admin
		const admins = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
		adminUser = admins[0];
	});


	it('should prevent registering reserved usernames', async () => {
		await expect(
			registerUser('admin', 'password123', 'open')
		).rejects.toThrow('Username is a reserved system path.');
		
		await expect(
			registerUser('login', 'password123', 'open')
		).rejects.toThrow('Username is a reserved system path.');
	});

	it('should prevent invalid username formats', async () => {
		await expect(
			registerUser('a', 'password123', 'open')
		).rejects.toThrow('Username must be between 3 and 30 characters.');

		await expect(
			registerUser('user@name', 'password123', 'open')
		).rejects.toThrow('Username can only contain letters, numbers, underscores, hyphens, and dots.');
	});

	it('should block self-registration in invite-only mode', async () => {
		await expect(registerUser('invite_blocked', 'password123', 'invite_only')).rejects.toThrow(
			'Registration is currently closed.'
		);
	});

	it('should register a pending user under approval_required mode', async () => {
		const username = 'pending_user';
		const userId = await registerUser(username, 'password123', 'approval_required');

		const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		expect(user[0].status).toBe('pending');
		expect(user[0].displayName).toBe(username);

		// Pending users should fail login check in application hooks (validateSession works, but status pending is checked)
		expect(user[0].status).toBe('pending');
	});

	it('should register an active user under open mode', async () => {
		const username = 'active_user';
		const userId = await registerUser(username, 'password123', 'open');

		const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		expect(user[0].status).toBe('active');
	});

	it('should enforce username as the display name at the database boundary', async () => {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);
		await db.insert(users).values({
			id,
			username: 'database_name_test',
			normalizedUsername: 'database_name_test',
			displayName: 'Different Name',
			passwordHash: 'unused',
			role: 'user',
			status: 'active',
			createdAt: now,
			updatedAt: now
		});

		const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
		expect(user[0].displayName).toBe(user[0].username);
	});

	it('should support admin approval of pending user', async () => {
		const username = 'pending_approve_test';
		const userId = await registerUser(username, 'password123', 'approval_required');

		await approveUser(adminUser.id, adminUser.username, userId);

		const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		expect(user[0].status).toBe('active');
	});

	it('should support admin rejection of pending user', async () => {
		const username = 'pending_reject_test';
		const userId = await registerUser(username, 'password123', 'approval_required');

		await rejectUser(adminUser.id, adminUser.username, userId);

		const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		expect(user[0].status).toBe('rejected');
	});

	it('should ban a user and invalidate their sessions', async () => {
		const username = 'ban_test_user';
		const userId = await registerUser(username, 'password123', 'open');

		// Create a session
		await createSession('mocktoken123456789012345678901234567890123456789012345678901234567890', userId);

		// Verify session is valid
		const { user: u } = await validateSession('mocktoken123456789012345678901234567890123456789012345678901234567890');
		expect(u).not.toBeNull();

		// Ban user
		await banUser(adminUser.id, adminUser.username, userId);

		// Session should now be invalid
		const { user: u2 } = await validateSession('mocktoken123456789012345678901234567890123456789012345678901234567890');
		expect(u2).toBeNull();

		const userDb = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		expect(userDb[0].status).toBe('banned');
	});

	it('should prevent demoting, deleting, or banning the final active admin', async () => {
		// Attempting to demote the seeded admin when no other admin exists must throw
		await expect(
			demoteUser(adminUser.id, adminUser.username, adminUser.id)
		).rejects.toThrow('Cannot demote, ban, or delete the final remaining active administrator.');

		await expect(
			deleteUser(adminUser.id, adminUser.username, adminUser.id)
		).rejects.toThrow('Cannot demote, ban, or delete the final remaining active administrator.');

		await expect(
			banUser(adminUser.id, adminUser.username, adminUser.id)
		).rejects.toThrow('Cannot demote, ban, or delete the final remaining active administrator.');
	});
});
