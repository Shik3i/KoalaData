import db from './db';
import { projects, projectMembers, users } from './db/schema';
import { eq, and } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export interface ProjectAccessResult {
	project: typeof projects.$inferSelect;
	membershipRole: 'owner' | 'editor' | 'viewer' | 'admin';
}

/**
 * Enforce project-level authentication and authorization.
 * Resolves if allowed, otherwise throws a SvelteKit error (404/403).
 */
export async function assertProjectAccess(
	userId: string | null,
	projectId: string,
	requiredRole: 'owner' | 'editor' | 'viewer'
): Promise<ProjectAccessResult> {
	// 1. Fetch project
	const projectList = await db
		.select()
		.from(projects)
		.where(eq(projects.id, projectId))
		.limit(1);

	if (projectList.length === 0 || projectList[0].deletedAt !== null) {
		throw error(404, 'Project not found.');
	}

	const project = projectList[0];

	// Banned project safety: Banned projects are not accessible at all
	if (project.moderationStatus === 'banned') {
		throw error(404, 'Project not found.');
	}

	// 2. Identify the active user's role on the project
	let userRole: 'owner' | 'editor' | 'viewer' | 'admin' = 'viewer';

	if (userId) {
		// Fetch user to confirm admin status (optional if role is passed, but checking database is safest)
		const userRecord = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		const user = userRecord[0];

		if (user && user.role === 'admin') {
			userRole = 'admin';
		} else if (project.ownerId === userId) {
			userRole = 'owner';
		} else {
			// Check if they are an editor in the membership table
			const member = await db
				.select()
				.from(projectMembers)
				.where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
				.limit(1);

			if (member.length > 0 && member[0].role === 'editor') {
				userRole = 'editor';
			}
		}
	}

	// 3. Enforce visibility rules
	if (project.visibility === 'private') {
		// Only members (owner, editor) and admins can access private projects
		if (userRole === 'viewer') {
			// Throw 404 to avoid leaking project existence
			throw error(404, 'Project not found.');
		}
	}

	// 4. Enforce permission level requested
	if (requiredRole === 'owner') {
		if (userRole !== 'owner' && userRole !== 'admin') {
			throw error(403, 'Owner privileges required.');
		}
	}

	if (requiredRole === 'editor') {
		if (userRole !== 'owner' && userRole !== 'editor' && userRole !== 'admin') {
			throw error(403, 'Editor privileges required.');
		}
	}

	return {
		project,
		membershipRole: userRole
	};
}

/**
 * Assert that the user is an active administrator.
 */
export function assertAdmin(user: { role: string; status: string } | null | undefined) {
	if (!user || user.role !== 'admin' || user.status !== 'active') {
		throw error(403, 'Administrator access required.');
	}
}
