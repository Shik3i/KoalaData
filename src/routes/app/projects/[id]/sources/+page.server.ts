import { db } from '$lib/server/db';
import { dataSources } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { logAuditEvent } from '$lib/server/audit';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project, membershipRole } = await parent();

	const sources = await db
		.select()
		.from(dataSources)
		.where(eq(dataSources.projectId, project.id));

	return {
		sources,
		membershipRole
	};
};

export const actions: Actions = {
	addSource: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Must have Editor or Owner permissions
		await assertProjectAccess(locals.user.id, projectId, 'editor');

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() || '';
		const sourceType = data.get('sourceType')?.toString() as any;
		const granularity = data.get('granularity')?.toString() as any;
		const externalUrl = data.get('externalUrl')?.toString().trim() || null;

		if (!name || name.length < 3 || name.length > 50) {
			return fail(400, { error: 'Source name must be between 3 and 50 characters.' });
		}

		const validTypes = ['chrome_web_store', 'generic_csv'];
		if (!validTypes.includes(sourceType)) {
			return fail(400, { error: 'Invalid source type.' });
		}

		const validGranularities = ['daily', 'weekly', 'monthly', 'irregular'];
		if (!validGranularities.includes(granularity)) {
			return fail(400, { error: 'Invalid granularity.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		const sourceId = crypto.randomUUID();
		await db.insert(dataSources).values({
			id: sourceId,
			projectId,
			name,
			sourceType,
			granularity,
			externalUrl,
			createdAt: Math.floor(Date.now() / 1000),
			updatedAt: Math.floor(Date.now() / 1000)
		});

		await logAuditEvent(locals.user.id, locals.user.username, 'create_data_source', 'data_source', sourceId, { name, sourceType }, ip);

		return { success: 'Data source added successfully.' };
	},

	deleteSource: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Must be Owner or Admin to delete a source
		await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const sourceId = data.get('sourceId')?.toString() || '';

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		await db
			.delete(dataSources)
			.where(and(eq(dataSources.id, sourceId), eq(dataSources.projectId, projectId)));

		await logAuditEvent(locals.user.id, locals.user.username, 'delete_data_source', 'data_source', sourceId, {}, ip);

		return { success: 'Data source deleted successfully.' };
	}
};
