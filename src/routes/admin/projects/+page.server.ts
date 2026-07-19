import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { eq, and, like, isNotNull } from 'drizzle-orm';
import { logAuditEvent } from '$lib/server/audit';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals }) => {
	const query = url.searchParams.get('q')?.trim() || '';

	const conditions = [];

	if (query) {
		conditions.push(like(projects.name, `%${query}%`));
	}

	const list = await db
		.select()
		.from(projects)
		.where(and(...conditions))
		.orderBy(projects.name);

	return {
		projects: list,
		searchQuery: query
	};
};

export const actions: Actions = {
	changeModeration: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const projectId = data.get('projectId')?.toString() || '';
		const moderationStatus = data.get('moderationStatus')?.toString() as any;

		const validStatuses = ['active', 'hidden', 'banned'];
		if (!validStatuses.includes(moderationStatus)) {
			return fail(400, { error: 'Invalid moderation status.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		await db
			.update(projects)
			.set({
				moderationStatus,
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(eq(projects.id, projectId));

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'admin_moderate_project',
			'project',
			projectId,
			{ moderationStatus },
			ip
		);

		return { success: 'Project moderation status updated.' };
	},

	changeVerification: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const projectId = data.get('projectId')?.toString() || '';
		const verificationStatus = data.get('verificationStatus')?.toString() as any;

		const validStatuses = ['verified', 'unverified'];
		if (!validStatuses.includes(verificationStatus)) {
			return fail(400, { error: 'Invalid verification status.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		await db
			.update(projects)
			.set({
				verificationStatus,
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(eq(projects.id, projectId));

		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'admin_verify_project',
			'project',
			projectId,
			{ verificationStatus },
			ip
		);

		return { success: 'Project verification status updated.' };
	},

	restore: async ({ request, locals, getClientAddress }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const data = await request.formData();
		const projectId = data.get('projectId')?.toString() || '';
		const restored = await db
			.update(projects)
			.set({ deletedAt: null, updatedAt: Math.floor(Date.now() / 1000) })
			.where(and(eq(projects.id, projectId), isNotNull(projects.deletedAt)))
			.returning({ id: projects.id });

		if (restored.length === 0) {
			return fail(404, { error: 'Deleted project not found.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}
		await logAuditEvent(locals.user.id, locals.user.username, 'admin_restore_project', 'project', projectId, {}, ip);
		return { success: 'Project restored successfully.' };
	}
};
