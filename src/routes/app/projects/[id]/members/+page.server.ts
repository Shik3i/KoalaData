import { db } from '$lib/server/db';
import { projectMembers, projects, users } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { logAuditEvent } from '$lib/server/audit';
import { isSqliteUniqueConstraint } from '$lib/server/db/errors';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project, membershipRole } = await parent();

	// Fetch owner details
	const ownerRecord = await db
		.select({
			id: users.id,
			username: users.username
		})
		.from(users)
		.where(eq(users.id, project.ownerId))
		.limit(1);

	// Fetch all editors
	const editors = await db
		.select({
			memberId: projectMembers.id,
			userId: users.id,
			username: users.username,
			role: projectMembers.role,
			createdAt: projectMembers.createdAt
		})
		.from(projectMembers)
		.innerJoin(users, eq(projectMembers.userId, users.id))
		.where(eq(projectMembers.projectId, project.id));

	return {
		owner: ownerRecord[0],
		editors,
		membershipRole
	};
};

export const actions: Actions = {
	addEditor: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Assert access: Must be Owner or Admin to add editors
		const { project } = await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const username = data.get('username')?.toString().trim() || '';

		if (!username) {
			return fail(400, { error: 'Username is required.' });
		}

		// Find target user by username
		const targetRecord = await db
			.select()
			.from(users)
			.where(eq(users.normalizedUsername, username.toLowerCase()))
			.limit(1);

		if (targetRecord.length === 0 || targetRecord[0].status !== 'active') {
			return fail(400, { error: 'Active user not found with that username.' });
		}

		const target = targetRecord[0];

		// Check if target is already the owner
		if (project.ownerId === target.id) {
			return fail(400, { error: 'User is already the owner of this project.' });
		}

		// Check if target is already an editor
		const existingMember = await db
			.select()
			.from(projectMembers)
			.where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, target.id)))
			.limit(1);

		if (existingMember.length > 0) {
			return fail(400, { error: 'User is already a member of this project.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		// Insert
		try {
			await db.insert(projectMembers).values({
				id: crypto.randomUUID(),
				projectId,
				userId: target.id,
				role: 'editor',
				createdAt: Math.floor(Date.now() / 1000)
			});
		} catch (error) {
			if (isSqliteUniqueConstraint(error)) {
				return fail(409, { error: 'User is already a member of this project.' });
			}
			throw error;
		}

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'add_project_editor',
			'project',
			projectId,
			{ added_user_id: target.id, added_username: target.username },
			ip
		);

		return { success: 'Editor added successfully.' };
	},

	removeEditor: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Assert access: Must be Owner or Admin to remove editors
		await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const userId = data.get('userId')?.toString() || '';

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		await db
			.delete(projectMembers)
			.where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'remove_project_editor',
			'project',
			projectId,
			{ removed_user_id: userId },
			ip
		);

		return { success: 'Editor removed.' };
	},

	transferOwnership: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Assert access: Must be Owner or Admin to transfer ownership
		const { project } = await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const newOwnerUsername = data.get('newOwnerUsername')?.toString().trim() || '';
		const expectedOwnerId = data.get('expectedOwnerId')?.toString() || '';

		if (!newOwnerUsername) {
			return fail(400, { error: 'Username is required.' });
		}
		if (!expectedOwnerId) return fail(400, { error: 'Current owner context is missing. Reload and try again.' });

		// Find target user
		const targetRecord = await db
			.select()
			.from(users)
			.where(eq(users.normalizedUsername, newOwnerUsername.toLowerCase()))
			.limit(1);

		if (targetRecord.length === 0 || targetRecord[0].status !== 'active') {
			return fail(400, { error: 'Active user not found with that username.' });
		}

		const target = targetRecord[0];

		if (project.ownerId === target.id) {
			return fail(400, { error: 'User is already the owner.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		// Re-check ownership and target status in the same write transaction so
		// parallel transfers cannot apply a stale owner snapshot.
		const transfer = db.transaction((tx) => {
			const currentProject = tx
				.select({ ownerId: projects.ownerId })
				.from(projects)
				.where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
				.get();
			if (!currentProject) return 'missing' as const;
			if (currentProject.ownerId !== expectedOwnerId) {
				return 'stale' as const;
			}
			if (currentProject.ownerId === target.id) return 'same' as const;

			const currentTarget = tx
				.select({ status: users.status })
				.from(users)
				.where(eq(users.id, target.id))
				.get();
			if (!currentTarget || currentTarget.status !== 'active') return 'inactive' as const;

			// 1. Remove new owner from project_members if they were an editor
			tx
				.delete(projectMembers)
				.where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, target.id)))
				.run();

			// 2. Add old owner as editor to keep their access, if they are not admin
			// (Admin always has full access, but we can make them editor for consistency)
			const oldOwnerId = currentProject.ownerId;
			tx.insert(projectMembers).values({
				id: crypto.randomUUID(),
				projectId,
				userId: oldOwnerId,
				role: 'editor',
				createdAt: Math.floor(Date.now() / 1000)
			}).onConflictDoNothing().run();

			// 3. Update project ownerId
			tx
				.update(projects)
				.set({
					ownerId: target.id,
					updatedAt: Math.floor(Date.now() / 1000)
				})
				.where(and(eq(projects.id, projectId), eq(projects.ownerId, oldOwnerId), isNull(projects.deletedAt)))
				.run();
			return 'transferred' as const;
		});

		if (transfer === 'missing') return fail(404, { error: 'Project no longer exists.' });
		if (transfer === 'stale') return fail(409, { error: 'Project ownership changed before this transfer completed. Reload and try again.' });
		if (transfer === 'same') return fail(409, { error: 'User is already the owner.' });
		if (transfer === 'inactive') return fail(409, { error: 'The selected user is no longer active.' });

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'transfer_project_ownership',
			'project',
			projectId,
			{ new_owner_id: target.id, new_owner_username: target.username },
			ip
		);

		// Redirect user back to workspace or project overview since role might have changed
		throw redirect(302, `/app/projects/${projectId}`);
	}
};
