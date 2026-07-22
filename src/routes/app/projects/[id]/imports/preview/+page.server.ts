import { db } from '$lib/server/db';
import { importDrafts } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { parseCsv } from '$lib/server/csv/parser';
import { detectChromeCsv } from '$lib/server/csv/chrome';
import { confirmImportDraft, getDraftFilePath, parseStoredFilename } from '$lib/server/csv/pipeline';
import { classifyChromeReportFilename } from '$lib/dashboard-metrics';
import { fail, redirect } from '@sveltejs/kit';
import fs from 'fs';
import path from 'path';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, params, locals }) => {
	const projectId = params.id;
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	// Assert editor access
	await assertProjectAccess(locals.user.id, projectId, 'editor');

	const draftId = url.searchParams.get('draftId') || '';
	if (!draftId) {
		throw redirect(302, `/app/projects/${projectId}/imports?error=missing_draft`);
	}

	// Fetch draft
	const draftRecord = await db
		.select()
		.from(importDrafts)
		.where(
			and(
				eq(importDrafts.id, draftId),
				eq(importDrafts.projectId, projectId),
				eq(importDrafts.userId, locals.user.id)
			)
		)
		.limit(1);

	if (draftRecord.length === 0) {
		throw redirect(302, `/app/projects/${projectId}/imports?error=draft_not_found`);
	}

	const draft = draftRecord[0];

	// Verify expiration
	if (Math.floor(Date.now() / 1000) >= draft.expiresAt) {
		throw redirect(302, `/app/projects/${projectId}/imports?error=draft_expired`);
	}

	// Read CSV file from disk to extract headers and preview rows
	const dataDir = process.env.DATA_DIRECTORY || './data';
	const { originalName: originalFilename, fileId } = parseStoredFilename(draft.storedFilename);
	let draftFilePath: string;
	try {
		draftFilePath = getDraftFilePath(dataDir, fileId);
	} catch {
		throw redirect(302, `/app/projects/${projectId}/imports?error=draft_file_invalid`);
	}

	if (!fs.existsSync(draftFilePath)) {
		throw redirect(302, `/app/projects/${projectId}/imports?error=draft_file_missing`);
	}

	const fileBuffer = fs.readFileSync(draftFilePath);
	const parsed = parseCsv(fileBuffer);

	// Try auto-detection of Chrome Web Store headers
	const autoDetect = detectChromeCsv(parsed.headers, parsed.rows);
	const report = classifyChromeReportFilename(originalFilename);
	const inconsistentRowCount = parsed.rows.filter((row) => row.length !== parsed.headers.length).length;

	return {
		draft: {
			id: draft.id,
			sourceId: draft.sourceId,
			rowCount: draft.rowCount,
			expiresAt: draft.expiresAt
		},
		originalFilename,
		parser: {
			delimiter: draft.detectedDelimiter === '\t' ? 'tab' : draft.detectedDelimiter,
			encoding: draft.detectedEncoding,
			inconsistentRowCount
		},
		previewHeaders: parsed.headers,
		previewRows: parsed.rows.slice(0, 5),
		autoDetect,
		report
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Assert editor access
		await assertProjectAccess(locals.user.id, projectId, 'editor');

		const data = await request.formData();
		const draftId = data.get('draftId')?.toString() || '';
		const dateColumn = data.get('dateColumn')?.toString() || '';
		const dateFormat = data.get('dateFormat')?.toString() || 'YYYY-MM-DD';

		if (!draftId) {
			return fail(400, { error: 'Draft ID is missing.' });
		}

		// Fetch draft
		const draftRecord = await db
			.select()
			.from(importDrafts)
			.where(
				and(
					eq(importDrafts.id, draftId),
					eq(importDrafts.projectId, projectId),
					eq(importDrafts.userId, locals.user.id)
				)
			)
			.limit(1);

		if (draftRecord.length === 0) {
			return fail(400, { error: 'Draft has expired or is invalid.' });
		}

		const draft = draftRecord[0];
		const headers = JSON.parse(draft.headers) as string[];
		const { originalName: originalFilename } = parseStoredFilename(draft.storedFilename);
		const report = classifyChromeReportFilename(originalFilename);
		const fileLabel = originalFilename.replace(/\.[^.]+$/, '').replace(/_[a-z0-9]{32}$/i, '').trim();

		// Loop through headers and pull mappings
		const metrics = [];
		for (let i = 0; i < headers.length; i++) {
			const colName = headers[i];
			if (data.get(`map_col_${i}`) === 'true') {
				const metricType = data.get(`type_col_${i}`)?.toString() || 'custom';
				const name = data.get(`name_col_${i}`)?.toString().trim() || colName;
				const requestedAggregation = data.get(`agg_col_${i}`)?.toString() || 'sum';
				const aggregation = metricType === 'active_users' || report?.semantics === 'snapshot'
					? 'latest'
					: requestedAggregation;
				const isCumulative = data.get(`cum_col_${i}`) === 'true';
				if (!['latest', 'sum', 'average', 'minimum', 'maximum'].includes(aggregation)) {
					return fail(400, { error: `Invalid aggregation for column "${colName}".` });
				}

				metrics.push({
					columnName: colName,
					metricType,
					name: metricType === 'custom' && report ? fileLabel : name,
					unit: 'count', // default count
					aggregation,
					isCumulative,
					dimensions: metricType === 'custom' && report ? { [report.dimensionKey]: colName } : undefined
				});
			}
		}

		if (!dateColumn) {
			return fail(400, { error: 'Please specify the date column.' });
		}

		if (metrics.length === 0) {
			return fail(400, { error: 'At least one column must be checked and mapped to a metric.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			// Trigger the pipeline confirm action
			const result = await confirmImportDraft(
				locals.user.id,
				locals.user.username,
				projectId,
				draftId,
				{
					dateColumn,
					dateFormat,
					metrics
				},
				ip
			);

			throw redirect(
				302,
				`/app/projects/${projectId}/imports?success=Imported ${result.rowCount} rows successfully. Overlaps: ${result.overlapCount}, Duplicates: ${result.duplicateCount}, Warnings: ${result.warningCount}.`
			);
		} catch (e: any) {
			if (e.status === 302) throw e;
			return fail(400, { error: e.message || 'Import mapping failed.' });
		}
	}
};
