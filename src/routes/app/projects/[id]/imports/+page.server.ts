import { db } from '$lib/server/db';
import { importBatches, dataSources, metricObservations, importDrafts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { createImportDraft } from '$lib/server/csv/pipeline';
import { logAuditEvent } from '$lib/server/audit';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import fs from 'fs';
import path from 'path';

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

	// Load pending drafts for manual mapping
	const drafts = await db
		.select()
		.from(importDrafts)
		.where(eq(importDrafts.projectId, project.id));

	return {
		sources,
		history,
		drafts: drafts.map((d) => ({
			id: d.id,
			originalFilename: d.storedFilename.includes(':::') ? d.storedFilename.split(':::')[0] : d.storedFilename,
			rowCount: d.rowCount,
			createdAt: d.createdAt
		})),
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
		const files = data.getAll('file') as File[];

		if (!sourceId) {
			return fail(400, { error: 'Please select a data source.' });
		}

		if (files.length === 0 || (files.length === 1 && files[0].size === 0)) {
			return fail(400, { error: 'Please upload at least one CSV file.' });
		}

		let reviewCount = 0;
		let lastDraftId = '';
		const errors: string[] = [];

		for (const file of files) {
			if (file.size === 0) continue;

			try {
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				// Every file enters a reviewable draft. High-confidence mappings are
				// preconfigured on the preview page but never committed silently.
				const draftId = await createImportDraft(
					locals.user.id,
					projectId,
					sourceId,
					file.name,
					buffer
				);
				lastDraftId = draftId;
				reviewCount++;
			} catch (e: any) {
				errors.push(`File "${file.name}" import failed: ${e.message}`);
			}
		}

		if (errors.length > 0) {
			return fail(400, { 
				error: `Upload partially failed. ${reviewCount} files are ready for review. Errors: ${errors.join('; ')}`
			});
		}

		// Direct redirect to preview if exactly one file requires review.
		if (reviewCount === 1) {
			throw redirect(302, `/app/projects/${projectId}/imports/preview?draftId=${lastDraftId}`);
		}

		// Otherwise redirect to the review queue.
		const message = `${reviewCount} files uploaded. Review each detected mapping before importing.`;

		throw redirect(302, `/app/projects/${projectId}/imports?success=${encodeURIComponent(message)}`);
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
		try { ip = getClientAddress() || '127.0.0.1'; } catch (e) {}

		try {
			// Find the batch to delete physical file
			const batchRecord = await db
				.select()
				.from(importBatches)
				.where(eq(importBatches.id, batchId))
				.limit(1);

			const nowTime = Math.floor(Date.now() / 1000);

			if (batchRecord.length > 0) {
				const batch = batchRecord[0];
				if (batch.storedFilename) {
					const dataDir = process.env.DATA_DIRECTORY || './data';
					const filePath = path.join(dataDir, 'uploads', batch.storedFilename);
					try {
						if (fs.existsSync(filePath)) {
							fs.unlinkSync(filePath);
						}
					} catch (fsErr) {
						console.error('[Rollback] Failed to delete physical CSV file:', fsErr);
					}
				}

				// Run database updates inside transaction synchronously
				db.transaction((tx) => {
					// Delete observations belonging to batch to reclaim database space
					tx.delete(metricObservations).where(eq(metricObservations.importBatchId, batchId)).run();

					// Mark import batch row as reverted and raw file as deleted
					tx
						.update(importBatches)
						.set({
							revertedAt: nowTime,
							rawFileDeletedAt: nowTime
						})
						.where(eq(importBatches.id, batchId))
						.run();
				});
			}

			await logAuditEvent(
				locals.user.id,
				locals.user.username,
				'rollback_import_batch',
				'import_batch',
				batchId,
				{},
				ip
			);

			return { success: 'Import batch rolled back successfully. Physical files and active database observations have been purged.' };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Rollback failed.' });
		}
	}
};
