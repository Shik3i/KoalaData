import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Query all projects that opted in to leaderboards
	const optedProjects = await db
		.select()
		.from(projects)
		.where(and(eq(projects.leaderboardOptIn, 1), isNull(projects.deletedAt)))
		.orderBy(projects.name);

	return {
		projects: optedProjects
	};
};

export const actions: Actions = {
	approve: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const projectId = data.get('projectId')?.toString() || '';

		if (!projectId) {
			return fail(400, { error: 'Project ID is required.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		const updated = await db
			.update(projects)
			.set({
				leaderboardStatus: 'approved',
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(and(
				eq(projects.id, projectId),
				eq(projects.visibility, 'public'),
				eq(projects.leaderboardOptIn, 1),
				eq(projects.moderationStatus, 'active'),
				isNull(projects.deletedAt)
			))
			.returning({ id: projects.id });
		if (updated.length === 0) return fail(409, { error: 'Project is not eligible for leaderboard approval.' });

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'admin_approve_leaderboard',
			'project',
			projectId,
			{ status: 'approved' },
			ip
		);

		return { success: 'Project approved for leaderboards.' };
	},

	reject: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const projectId = data.get('projectId')?.toString() || '';

		if (!projectId) {
			return fail(400, { error: 'Project ID is required.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		const updated = await db
			.update(projects)
			.set({
				leaderboardStatus: 'rejected',
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(and(eq(projects.id, projectId), eq(projects.leaderboardOptIn, 1), isNull(projects.deletedAt)))
			.returning({ id: projects.id });
		if (updated.length === 0) return fail(404, { error: 'Leaderboard request not found.' });

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'admin_reject_leaderboard',
			'project',
			projectId,
			{ status: 'rejected' },
			ip
		);

		return { success: 'Project rejected for leaderboards.' };
	}
};
