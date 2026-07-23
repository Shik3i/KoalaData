import { db } from '$lib/server/db';
import { importBatches, dataSources, metricObservations, importDrafts } from '$lib/server/db/schema';
import { eq, and, isNull, desc, count } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { createImportDraft, confirmImportDraft, parseStoredFilename, getDraftFilePath } from '$lib/server/csv/pipeline';
import { parseCsv } from '$lib/server/csv/parser';
import { detectChromeCsv } from '$lib/server/csv/chrome';
import { classifyChromeReportFilename } from '$lib/dashboard-metrics';
import { logAuditEvent } from '$lib/server/audit';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import fs from 'fs';
import path from 'path';
import { refreshPublicProjectStats } from '$lib/server/public-project-stats';

const HISTORY_PAGE_SIZE = 50;

function buildMetricsForAutoImport(originalFilename: string, autoDetect: ReturnType<typeof detectChromeCsv>) {
	if (!autoDetect?.mappings?.date?.column) return null;
	const report = classifyChromeReportFilename(originalFilename);
	const fileLabel = originalFilename.replace(/\.[^.]+$/, '').replace(/_[a-z0-9]{32}$/i, '').trim();
	const metrics = [];
	for (const [key, value] of Object.entries(autoDetect.mappings)) {
		if (key !== 'date' && value?.column) {
			metrics.push({
				columnName: value.column,
				metricType: value.metricType || 'custom',
				name: value.metricType === 'custom' && report ? fileLabel : value.metricType === 'custom' ? `${fileLabel}: ${value.column}` : value.column,
				unit: 'count',
				aggregation: value.metricType === 'active_users' || report?.semantics === 'snapshot' ? 'latest' : 'sum',
				isCumulative: false,
				dimensions: value.metricType === 'custom' && report ? { [report.dimensionKey]: value.column } : undefined
			});
		}
	}
	if (metrics.length === 0) return null;
	return {
		dateColumn: autoDetect.mappings.date.column,
		dateFormat: 'YYYY-MM-DD',
		metrics
	};
}

export const load: PageServerLoad = async ({ parent, locals, url }) => {
	const { project, membershipRole } = await parent();
	if (!locals.user) throw redirect(302, '/login');
	const requestedPage = Number.parseInt(url.searchParams.get('historyPage') ?? '1', 10);
	const historyPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

	const [sources, history, historyCount, drafts] = await Promise.all([
		db.select().from(dataSources).where(eq(dataSources.projectId, project.id)),
		db.select().from(importBatches)
			.where(eq(importBatches.projectId, project.id))
			.orderBy(desc(importBatches.createdAt))
			.limit(HISTORY_PAGE_SIZE)
			.offset((historyPage - 1) * HISTORY_PAGE_SIZE),
		db.select({ value: count() }).from(importBatches).where(eq(importBatches.projectId, project.id)),
		db.select().from(importDrafts)
			.where(and(eq(importDrafts.projectId, project.id), eq(importDrafts.userId, locals.user.id)))
	]);

	return {
		sources,
		history,
		drafts: drafts.map((d) => ({
			id: d.id,
			originalFilename: parseStoredFilename(d.storedFilename).originalName,
			rowCount: d.rowCount,
			createdAt: d.createdAt
		})),
		historyPage,
		historyPages: Math.max(1, Math.ceil(historyCount[0].value / HISTORY_PAGE_SIZE)),
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
		const files = (data.getAll('file') as File[]).filter((file) => file.size > 0);

		if (!sourceId) {
			return fail(400, { error: 'Please select a data source.' });
		}

		if (files.length === 0) {
			return fail(400, { error: 'Please upload at least one CSV file.' });
		}

		let autoImportedCount = 0;
		let manualCount = 0;
		let lastManualDraftId = '';
		const errors: string[] = [];

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch (e) {}

		for (const file of files) {
			try {
				const arrayBuffer = await file.arrayBuffer();
				const buffer = Buffer.from(arrayBuffer);

				const parsed = parseCsv(buffer);
				const autoDetect = detectChromeCsv(parsed.headers, parsed.rows);
				const report = classifyChromeReportFilename(file.name);
				const hasStandardMetric = Object.values(autoDetect.mappings).some((mapping) =>
					mapping.metricType !== 'date' && mapping.metricType !== 'custom'
				);
				const hasCustomMetric = Object.values(autoDetect.mappings).some((mapping) => mapping.metricType === 'custom');

				const canAutoImport = autoDetect.mappings.date && (report || (hasStandardMetric && !hasCustomMetric) || autoDetect.confidence === 'high');

				if (canAutoImport) {
					const draftId = await createImportDraft(
						locals.user.id,
						projectId,
						sourceId,
						file.name,
						buffer
					);
					const mappingConfig = buildMetricsForAutoImport(file.name, autoDetect);
					if (mappingConfig) {
						await confirmImportDraft(
							locals.user.id,
							locals.user.username,
							projectId,
							draftId,
							mappingConfig,
							ip
						);
						autoImportedCount++;
					} else {
						lastManualDraftId = draftId;
						manualCount++;
					}
				} else {
					const draftId = await createImportDraft(
						locals.user.id,
						projectId,
						sourceId,
						file.name,
						buffer
					);
					lastManualDraftId = draftId;
					manualCount++;
				}
			} catch (e: any) {
				errors.push(`File "${file.name}" import failed: ${e.message}`);
			}
		}

		if (errors.length > 0) {
			return fail(400, { 
				error: `Upload partially failed. ${autoImportedCount} files auto-imported, ${manualCount} files pending manual review. Errors: ${errors.join('; ')}`
			});
		}

		// Direct redirect to preview if exactly one file requires manual mapping and none auto-imported.
		if (manualCount === 1 && autoImportedCount === 0) {
			throw redirect(302, `/app/projects/${projectId}/imports/preview?draftId=${lastManualDraftId}`);
		}

		let message = `${autoImportedCount} files imported successfully.`;
		if (manualCount > 0) {
			message += ` ${manualCount} files require manual column mapping (see list below).`;
		}

		throw redirect(302, `/app/projects/${projectId}/imports?success=${encodeURIComponent(message)}`);
	},

	confirmAllDrafts: async ({ params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);
		await assertProjectAccess(locals.user.id, projectId, 'editor');

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch (e) {}

		const userDrafts = await db.select().from(importDrafts).where(
			and(eq(importDrafts.projectId, projectId), eq(importDrafts.userId, locals.user.id))
		);

		if (userDrafts.length === 0) {
			return fail(400, { error: 'No pending drafts to import.' });
		}

		const dataDir = process.env.DATA_DIRECTORY || './data';
		let importedCount = 0;
		let failedCount = 0;

		for (const draft of userDrafts) {
			try {
				const { originalName, fileId } = parseStoredFilename(draft.storedFilename);
				const draftFilePath = getDraftFilePath(dataDir, fileId);
				if (!fs.existsSync(draftFilePath)) continue;
				const buffer = fs.readFileSync(draftFilePath);
				const parsed = parseCsv(buffer);
				const autoDetect = detectChromeCsv(parsed.headers, parsed.rows);

				if (autoDetect.mappings.date) {
					const mappingConfig = buildMetricsForAutoImport(originalName, autoDetect);
					if (mappingConfig) {
						await confirmImportDraft(
							locals.user.id,
							locals.user.username,
							projectId,
							draft.id,
							mappingConfig,
							ip
						);
						importedCount++;
					} else {
						failedCount++;
					}
				} else {
					failedCount++;
				}
			} catch (e) {
				failedCount++;
			}
		}

		throw redirect(302, `/app/projects/${projectId}/imports?success=${encodeURIComponent(`${importedCount} pending drafts auto-imported successfully.${failedCount > 0 ? ` ${failedCount} drafts require manual mapping.` : ''}`)}`);
	},

	rollbackBatch: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);
		const currentUser = locals.user;

		// Must be Owner or Admin to rollback imports
		await assertProjectAccess(currentUser.id, projectId, 'owner');

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
				.where(and(eq(importBatches.id, batchId), eq(importBatches.projectId, projectId), isNull(importBatches.revertedAt)))
				.limit(1);
			if (batchRecord.length === 0) return fail(404, { error: 'Active import batch not found.' });

			const nowTime = Math.floor(Date.now() / 1000);
			let rawFileDeleted = !batchRecord[0].storedFilename;

			{
				const batch = batchRecord[0];
				// Run database updates inside transaction synchronously
				db.transaction((tx) => {
					const updateResult = tx
						.update(importBatches)
						.set({
							revertedAt: nowTime,
							revertedBy: currentUser.id,
							status: 'reverted'
						})
						.where(and(eq(importBatches.id, batchId), eq(importBatches.projectId, projectId), isNull(importBatches.revertedAt)))
						.run();
					if (updateResult.changes === 0) throw new Error('Import batch was already reverted.');
					tx.delete(metricObservations).where(eq(metricObservations.importBatchId, batchId)).run();
				});

				if (batch.storedFilename && path.basename(batch.storedFilename) === batch.storedFilename) {
					const dataDir = process.env.DATA_DIRECTORY || './data';
					const filePath = path.join(dataDir, 'uploads', batch.storedFilename);
					try {
						if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
						await db.update(importBatches).set({ rawFileDeletedAt: nowTime }).where(eq(importBatches.id, batchId));
						rawFileDeleted = true;
					} catch (fsErr) {
						console.error('[Rollback] Failed to delete physical CSV file:', fsErr);
					}
				}
			}

				await logAuditEvent(
				currentUser.id,
				currentUser.username,
				'rollback_import_batch',
				'import_batch',
				batchId,
				{},
					ip
				);
				try {
					await refreshPublicProjectStats([projectId]);
				} catch (refreshError) {
					console.error('[Public Stats] Rollback refresh failed:', refreshError);
				}

				return {
				success: rawFileDeleted
					? 'Import batch rolled back successfully. Physical files and active database observations have been purged.'
					: 'Import batch rolled back. Its observations were purged, but the raw file could not be deleted and remains counted toward storage.'
			};
		} catch (e: any) {
			return fail(400, { error: e.message || 'Rollback failed.' });
		}
	}
};
