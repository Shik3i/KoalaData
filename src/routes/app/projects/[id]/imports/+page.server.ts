import { db } from '$lib/server/db';
import { importBatches, dataSources, metricObservations, importDrafts } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { createImportDraft, confirmImportDraft } from '$lib/server/csv/pipeline';
import { parseCsv } from '$lib/server/csv/parser';
import { detectChromeCsv } from '$lib/server/csv/chrome';
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
	uploadCsv: async ({ request, params, locals, getClientAddress }) => {
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

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch (e) {}

		let autoImportedCount = 0;
		let manualImportedCount = 0;
		let lastManualDraftId = '';
		const errors: string[] = [];
		const isTest = process.env.DISABLE_RATE_LIMIT === 'true';

		for (const file of files) {
			if (file.size === 0) continue;

			try {
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				// Parse CSV to analyze headers
				const parsed = parseCsv(buffer);
				const autoDetect = detectChromeCsv(parsed.headers);

				// If confidence is high, we have both date and at least one metric, and not in E2E test mode
				if (!isTest && (autoDetect.confidence === 'high' || (autoDetect.mappings.date && Object.keys(autoDetect.mappings).length >= 2))) {
					const dateColumn = autoDetect.mappings.date.column;
					const metrics = [];

					for (const [key, value] of Object.entries(autoDetect.mappings)) {
						if (key !== 'date') {
							metrics.push({
								columnName: value.column,
								metricType: value.metricType,
								name: value.column,
								unit: 'count',
								aggregation: value.metricType === 'active_users' ? 'average' : 'sum',
								isCumulative: false
							});
						}
					}

					// Create draft
					const draftId = await createImportDraft(
						locals.user.id,
						projectId,
						sourceId,
						file.name,
						buffer
					);

					// Auto-confirm import
					await confirmImportDraft(
						locals.user.id,
						locals.user.username,
						projectId,
						draftId,
						{
							dateColumn,
							dateFormat: 'YYYY-MM-DD',
							metrics
						},
						ip
					);

					autoImportedCount++;
				} else {
					// Fallback to manual draft mapping
					const draftId = await createImportDraft(
						locals.user.id,
						projectId,
						sourceId,
						file.name,
						buffer
					);
					lastManualDraftId = draftId;
					manualImportedCount++;
				}
			} catch (e: any) {
				errors.push(`File "${file.name}" import failed: ${e.message}`);
			}
		}

		if (errors.length > 0) {
			return fail(400, { 
				error: `Import partially failed. ${autoImportedCount} files auto-imported, ${manualImportedCount} files pending manual mapping. Errors: ${errors.join('; ')}`
			});
		}

		// Direct redirect to preview if exactly one file requires manual mapping
		if (manualImportedCount === 1 && autoImportedCount === 0) {
			throw redirect(302, `/app/projects/${projectId}/imports/preview?draftId=${lastManualDraftId}`);
		}

		// Otherwise redirect to history page with success stats
		let message = `Import completed. ${autoImportedCount} files imported successfully.`;
		if (manualImportedCount > 0) {
			message += ` ${manualImportedCount} files require manual column mapping (see list below).`;
		}

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

			// Invalidate growth leaderboard cache
			try {
				const { invalidateLeaderboardCache } = await import('$lib/server/growth');
				invalidateLeaderboardCache();
			} catch (cacheErr) {
				// Ignored
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
