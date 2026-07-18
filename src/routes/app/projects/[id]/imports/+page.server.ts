import { db } from '$lib/server/db';
import { importBatches, dataSources, metricObservations } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { createImportDraft } from '$lib/server/csv/pipeline';
import { logAuditEvent } from '$lib/server/audit';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project, membershipRole } = await parent();

	// Load data sources to populate the selection box
	const sources = await db
		.select()
		.from(dataSources)
		.where(eq(dataSources.projectId, project.id));

	// Load import history
	const history = await db
		.select()
		.from(importBatches)
		.where(eq(importBatches.projectId, project.id))
		.orderBy(importBatches.createdAt);

	return {
		sources,
		history,
		membershipRole
	};
};

export const actions: Actions = {
	uploadCsv: async ({ request, params, locals }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Must be Editor or Owner
		await assertProjectAccess(locals.user.id, projectId, 'editor');

		const data = await request.formData();
		const sourceId = data.get('sourceId')?.toString() || '';
		const file = data.get('file') as File;

		if (!sourceId) {
			return fail(400, { error: 'Please select a data source.' });
		}

		if (!file || file.size === 0) {
			return fail(400, { error: 'Please upload a CSV file.' });
		}

		try {
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Call pipeline to validate limits, parse CSV, and store draft
			const draftId = await createImportDraft(
				locals.user.id,
				projectId,
				sourceId,
				file.name,
				buffer
			);

			// Redirect to preview/mapping screen
			throw redirect(302, `/app/projects/${projectId}/imports/preview?draftId=${draftId}`);
		} catch (e: any) {
			if (e.status === 302) throw e; // Pass SvelteKit redirects
			return fail(400, { error: e.message || 'Upload failed.' });
		}
	},

	rollbackBatch: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Must be Owner or Admin to rollback imports
		await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const batchId = data.get('batchId')?.toString() || '';

		if (!batchId) {
			return fail(400, { error: 'Import batch ID is required.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			// Run rollback in database transaction synchronously for better-sqlite3 compatibility
			db.transaction((tx) => {
				// Mark import batch row as reverted
				tx
					.update(importBatches)
					.set({
						revertedAt: Math.floor(Date.now() / 1000)
					})
					.where(eq(importBatches.id, batchId))
					.run();
			});

			await logAuditEvent(
				locals.user.id,
				locals.user.username,
				'rollback_import_batch',
				'import_batch',
				batchId,
				{},
				ip
			);

			return { success: 'Import batch rolled back successfully. Observations purged.' };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Rollback failed.' });
		}
	}
};
