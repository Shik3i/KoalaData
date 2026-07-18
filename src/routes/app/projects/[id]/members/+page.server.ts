import { db } from '$lib/server/db';
import { projectMembers, projects, users } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { logAuditEvent } from '$lib/server/audit';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project, membershipRole } = await parent();

	// Fetch owner details
	const ownerRecord = await db
		.select({
			id: users.id,
			username: users.username,
			displayName: users.displayName
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
			displayName: users.displayName,
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
		await db.insert(projectMembers).values({
			id: crypto.randomUUID(),
			projectId,
			userId: target.id,
			role: 'editor',
			createdAt: Math.floor(Date.now() / 1000)
		});

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

		if (!newOwnerUsername) {
			return fail(400, { error: 'Username is required.' });
		}

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

		// Execute Transfer in Transaction
		await db.transaction(async (tx) => {
			// 1. Remove new owner from project_members if they were an editor
			await tx
				.delete(projectMembers)
				.where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, target.id)));

			// 2. Add old owner as editor to keep their access, if they are not admin
			// (Admin always has full access, but we can make them editor for consistency)
			const oldOwnerId = project.ownerId;
			await tx.insert(projectMembers).values({
				id: crypto.randomUUID(),
				projectId,
				userId: oldOwnerId,
				role: 'editor',
				createdAt: Math.floor(Date.now() / 1000)
			});

			// 3. Update project ownerId
			await tx
				.update(projects)
				.set({
					ownerId: target.id,
					updatedAt: Math.floor(Date.now() / 1000)
				})
				.where(eq(projects.id, projectId));
		});

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
