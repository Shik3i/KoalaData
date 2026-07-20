import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db from '../db';
import { importDrafts, importBatches, metricObservations, metricDefinitions, projects, dataSources } from '../db/schema';
import { eq, and, isNull, ne, sum, count, lte, inArray } from 'drizzle-orm';
import { parseCsv } from './parser';
import { logAuditEvent } from '../audit';
import { getUserLimits } from '../limits';

const DRAFTS_TTL_MS = 60 * 60 * 1000; // 1 hour

function parseStoredFilename(storedFilename: string): { originalName: string; fileId: string } {
	const parts = storedFilename.split(':::');
	if (parts.length > 1) {
		return { originalName: parts[0], fileId: parts[1] };
	}
	return { originalName: storedFilename, fileId: storedFilename };
}

/**
 * Normalizes number formats by removing currency signs, commas, and white spaces.
 */
export function parseNumericValue(val: string): number {
	if (val === undefined || val === null) {
		throw new Error('Numeric value is missing or undefined.');
	}
	const cleaned = String(val).replace(/[^0-9.-]/g, '');
	const parsed = parseFloat(cleaned);
	if (isNaN(parsed)) {
		throw new Error(`Invalid number: ${val}`);
	}
	return parsed;
}

/**
 * Standardizes date string to YYYY-MM-DD format.
 */
export function parseDateString(dateStr: string, format = 'YYYY-MM-DD'): string {
	if (dateStr === undefined || dateStr === null) {
		throw new Error('Date value is missing or undefined.');
	}
	const trimmed = String(dateStr).trim();
	
	// YYYY-MM-DD checks
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return trimmed;
	}

	// German DD.MM.YYYY or DD.MM.YY checks (e.g. 20.04.26)
	if (/^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(trimmed)) {
		const parts = trimmed.split('.');
		const d = parts[0].padStart(2, '0');
		const m = parts[1].padStart(2, '0');
		let y = parts[2];
		if (y.length === 2) {
			const yearNum = parseInt(y, 10);
			y = yearNum > 70 ? `19${y}` : `20${y}`;
		}
		return `${y}-${m}-${d}`;
	}

	// Try checking MM/DD/YYYY
	if (format === 'MM/DD/YYYY') {
		const parts = trimmed.split(/[\/\-]/);
		if (parts.length === 3) {
			const m = parts[0].padStart(2, '0');
			const d = parts[1].padStart(2, '0');
			const y = parts[2];
			if (y.length === 4) return `${y}-${m}-${d}`;
		}
	}

	// Try checking DD/MM/YYYY
	if (format === 'DD/MM/YYYY') {
		const parts = trimmed.split(/[\/\-]/);
		if (parts.length === 3) {
			const d = parts[0].padStart(2, '0');
			const m = parts[1].padStart(2, '0');
			const y = parts[2];
			if (y.length === 4) return `${y}-${m}-${d}`;
		}
	}

	// General fallback Date parse
	const ts = Date.parse(trimmed);
	if (!isNaN(ts)) {
		const dateObj = new Date(ts);
		const y = dateObj.getFullYear();
		const m = String(dateObj.getMonth() + 1).padStart(2, '0');
		const d = String(dateObj.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}`;
	}

	throw new Error(`Unrecognized date format: ${dateStr}`);
}

/**
 * Step 1: Upload a CSV, parse headers, validate limits, and save it as a temporary draft.
 */
export async function createImportDraft(
	userId: string,
	projectId: string,
	sourceId: string,
	originalFilename: string,
	buffer: Buffer
): Promise<string> {
	// Fetch limits
	const { limits } = await getUserLimits(userId);

	// Validate file size limit
	if (buffer.length > limits.maxCsvSizeBytes) {
		throw new Error(`CSV file size exceeds the limit of ${limits.maxCsvSizeBytes / (1024 * 1024)}MB.`);
	}

	// Parse CSV
	const parsed = parseCsv(buffer);

	// Validate row count limit
	if (parsed.rows.length > limits.maxCsvRows) {
		throw new Error(`CSV exceeds the row limit of ${limits.maxCsvRows} rows.`);
	}

	// Ensure temporary draft directory exists
	const dataDir = process.env.DATA_DIRECTORY || './data';
	const draftsDir = path.join(dataDir, 'uploads', 'drafts');
	if (!fs.existsSync(draftsDir)) {
		fs.mkdirSync(draftsDir, { recursive: true });
	}

	// Save temporary file
	const draftFileId = crypto.randomUUID();
	const storedFilename = `${originalFilename}:::${draftFileId}.tmp`;
	const draftFilePath = path.join(draftsDir, `${draftFileId}.tmp`);
	
	fs.writeFileSync(draftFilePath, buffer);

	// Insert draft metadata
	const draftId = crypto.randomUUID();
	const now = Math.floor(Date.now() / 1000);
	const expiresAt = now + Math.floor(DRAFTS_TTL_MS / 1000);

	await db.insert(importDrafts).values({
		id: draftId,
		userId,
		projectId,
		sourceId,
		storedFilename,
		detectedDelimiter: parsed.delimiter,
		detectedEncoding: parsed.encoding,
		headers: JSON.stringify(parsed.headers),
		rowCount: parsed.rows.length,
		createdAt: now,
		expiresAt
	});

	return draftId;
}

/**
 * Step 2: Confirm import, mapping columns to metric definitions and executing insertions.
 */
export async function confirmImportDraft(
	userId: string,
	username: string,
	projectId: string,
	draftId: string,
	mappingConfig: {
		dateColumn: string;
		dateFormat: string;
		metrics: Array<{
			columnName: string;
			metricType: string;
			name: string;
			unit: string;
			aggregation: string;
			isCumulative: boolean;
		}>;
	},
	actorIp = '127.0.0.1'
) {
	// 1. Fetch Draft details
	const draftRecord = await db
		.select()
		.from(importDrafts)
		.where(eq(importDrafts.id, draftId))
		.limit(1);

	if (draftRecord.length === 0) {
		throw new Error('Import draft not found or has expired.');
	}

	const draft = draftRecord[0];

	// Verify expiration
	if (Math.floor(Date.now() / 1000) >= draft.expiresAt) {
		await cleanupDraft(draft.id);
		throw new Error('Import draft has expired. Please re-upload your file.');
	}

	// Claim/lock the draft atomically by deleting it. If another request did it, changes will be 0.
	const deleteResult = await db.delete(importDrafts).where(eq(importDrafts.id, draftId)).run();
	if (deleteResult.changes === 0) {
		throw new Error('Import draft has already been processed or is invalid.');
	}

	// Verify user limits (storage bounds)
	const { limits, usage } = await getUserLimits(userId);
	const dataDir = process.env.DATA_DIRECTORY || './data';
	const { originalName, fileId } = parseStoredFilename(draft.storedFilename);
	const draftFilePath = path.join(dataDir, 'uploads', 'drafts', fileId);
	
	if (!fs.existsSync(draftFilePath)) {
		throw new Error('Temporary draft file is missing.');
	}

	const draftStat = fs.statSync(draftFilePath);
	if (usage.storageBytes + draftStat.size > limits.maxStorageBytes) {
		throw new Error(`CSV import size violates your storage quota of ${limits.maxStorageBytes / (1024 * 1024)}MB.`);
	}

	// 2. Setup final storage file path
	const uploadsDir = path.join(dataDir, 'uploads');
	if (!fs.existsSync(uploadsDir)) {
		fs.mkdirSync(uploadsDir, { recursive: true });
	}

	const batchId = crypto.randomUUID();
	const finalFilename = `${batchId}.csv`;
	const finalFilePath = path.join(uploadsDir, finalFilename);

	// 3. Move draft file to final private path FIRST (Filesystem-first ordering constraint)
	try {
		fs.renameSync(draftFilePath, finalFilePath);
	} catch (e: any) {
		throw new Error(`Failed to store original file: ${e.message}`);
	}

	// 4. Parse CSV data rows for observations import
	const fileBuffer = fs.readFileSync(finalFilePath);
	const parsed = parseCsv(fileBuffer);
	const headers = parsed.headers;
	
	const dateColIdx = headers.indexOf(mappingConfig.dateColumn);
	if (dateColIdx === -1) {
		fs.unlinkSync(finalFilePath); // Cleanup file if invalid mapping
		throw new Error(`Date column "${mappingConfig.dateColumn}" not found in CSV.`);
	}

	// Prepare metrics map
	const metricMappings = mappingConfig.metrics.map(m => {
		const idx = headers.indexOf(m.columnName);
		return { ...m, columnIndex: idx };
	}).filter(m => m.columnIndex !== -1);

	if (metricMappings.length === 0) {
		fs.unlinkSync(finalFilePath);
		throw new Error('At least one valid numeric metric column must be mapped.');
	}

	// Pre-resolve existing metric definitions
	const dbMetricsMap = new Map<string, typeof metricDefinitions.$inferSelect>();
	for (const m of metricMappings) {
		const existing = await db
			.select()
			.from(metricDefinitions)
			.where(
				and(
					eq(metricDefinitions.sourceId, draft.sourceId),
					eq(metricDefinitions.metricType, m.metricType as any),
					eq(metricDefinitions.name, m.name)
				)
			)
			.limit(1);
		if (existing.length > 0) {
			dbMetricsMap.set(m.columnName, existing[0]);
		}
	}

	// 5. Stream rows and prepare insertion buffers
	const now = Math.floor(Date.now() / 1000);
	const observationRows: Array<typeof metricObservations.$inferSelect> = [];
	
	let warningCount = 0;
	let errorCount = 0;
	let duplicateCount = 0;
	let overlapCount = 0;

	// In-file duplicate checking helper (metricId:date:dimensions)
	const inMemorySeen = new Set<string>();
	let minDateStr = '';
	let maxDateStr = '';

	// First pass: validate date strings and collect unique dates to query overlaps in bulk
	const uniqueDates = new Set<string>();
	for (let rIdx = 0; rIdx < parsed.rows.length; rIdx++) {
		const row = parsed.rows[rIdx];
		const rawDate = row[dateColIdx];
		if (rawDate !== undefined && rawDate !== null) {
			try {
				const parsedDate = parseDateString(rawDate, mappingConfig.dateFormat);
				uniqueDates.add(parsedDate);
			} catch (e) {
				// Handled in main pass
			}
		}
	}

	// Bulk overlap query
	const dbOverlapsSet = new Set<string>();
	if (uniqueDates.size > 0 && metricMappings.length > 0) {
		const dateList = Array.from(uniqueDates);
		const existingMetricIds = Array.from(dbMetricsMap.values()).map(m => m.id);

		if (existingMetricIds.length > 0) {
			const dateChunks = [];
			const chunkSize = 500;
			for (let i = 0; i < dateList.length; i += chunkSize) {
				dateChunks.push(dateList.slice(i, i + chunkSize));
			}

			for (const chunk of dateChunks) {
				const overlaps = await db
					.select({ metricId: metricObservations.metricId, date: metricObservations.date })
					.from(metricObservations)
					.innerJoin(importBatches, eq(metricObservations.importBatchId, importBatches.id))
					.where(
						and(
							inArray(metricObservations.metricId, existingMetricIds),
							inArray(metricObservations.date, chunk),
							eq(importBatches.status, 'completed'),
							isNull(importBatches.revertedAt)
						)
					);
				for (const o of overlaps) {
					dbOverlapsSet.add(`${o.metricId}:${o.date}`);
				}
			}
		}
	}

	// 6. Transaction Commitment & Compensating failures
	try {
		// Run transactions synchronously for better-sqlite3 compatibility
		db.transaction((tx) => {
			// Resolve or create Metric Definitions synchronously inside the transaction
			for (const m of metricMappings) {
				if (dbMetricsMap.has(m.columnName)) {
					continue;
				}

				let metricDef = tx
					.select()
					.from(metricDefinitions)
					.where(
						and(
							eq(metricDefinitions.sourceId, draft.sourceId),
							eq(metricDefinitions.metricType, m.metricType as any),
							eq(metricDefinitions.name, m.name)
						)
					)
					.get();

				if (!metricDef) {
					const metricId = crypto.randomUUID();
					const newMetric = {
						id: metricId,
						sourceId: draft.sourceId,
						metricType: m.metricType as any,
						name: m.name,
						unit: m.unit as any,
						aggregation: m.aggregation as any,
						isCumulative: m.isCumulative ? 1 : 0,
						participatesInLeaderboard: ['active_users', 'installs'].includes(m.metricType) ? 1 : 0,
						createdAt: now
					};
					tx.insert(metricDefinitions).values(newMetric).run();
					metricDef = newMetric as any;
				}
				dbMetricsMap.set(m.columnName, metricDef!);
			}

			// Process rows synchronously inside the transaction using our pre-calculated structures
			for (let rIdx = 0; rIdx < parsed.rows.length; rIdx++) {
				const row = parsed.rows[rIdx];
				try {
					const rawDate = row[dateColIdx];
					if (rawDate === undefined || rawDate === null) {
						throw new Error(`Date column at index ${dateColIdx} is missing in row ${rIdx + 1}`);
					}
					const parsedDate = parseDateString(rawDate, mappingConfig.dateFormat);

					if (!minDateStr || parsedDate < minDateStr) minDateStr = parsedDate;
					if (!maxDateStr || parsedDate > maxDateStr) maxDateStr = parsedDate;

					for (const m of metricMappings) {
						const rawVal = row[m.columnIndex];
						if (rawVal === undefined || rawVal === null) {
							throw new Error(`Metric column at index ${m.columnIndex} is missing in row ${rIdx + 1}`);
						}
						const parsedVal = parseNumericValue(rawVal);
						const metricDef = dbMetricsMap.get(m.columnName)!;

						const logicalKey = `${metricDef.id}:${parsedDate}`;

						// Duplicate check in uploaded file
						if (inMemorySeen.has(logicalKey)) {
							duplicateCount++;
							// Override previous in-memory row (take the last value)
							const existingIdx = observationRows.findIndex(x => x.metricId === metricDef.id && x.date === parsedDate);
							if (existingIdx !== -1) {
								observationRows[existingIdx].value = parsedVal;
							}
							continue;
						}

						inMemorySeen.add(logicalKey);

						// Overlap check against database using pre-computed Set
						if (dbOverlapsSet.has(logicalKey)) {
							overlapCount++;
						}

						observationRows.push({
							id: crypto.randomUUID(),
							importBatchId: batchId,
							sourceId: draft.sourceId,
							metricId: metricDef.id,
							date: parsedDate,
							value: parsedVal,
							dimensions: '{}',
							createdAt: now
						});
					}
				} catch (err) {
					errorCount++;
					warningCount++;
				}
			}

			// Write the import batch record
			tx.insert(importBatches).values({
				id: batchId,
				projectId,
				sourceId: draft.sourceId,
				userId,
				originalFilename: originalName, 
				storedFilename: finalFilename,
				fileSize: draftStat.size,
				checksum: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
				detectedImporter: 'manual',
				mappingConfig: JSON.stringify(mappingConfig),
				rowCount: parsed.rows.length,
				warningCount,
				errorCount,
				startDate: minDateStr || null,
				endDate: maxDateStr || null,
				status: 'completed',
				createdAt: now,
				completedAt: now,
				duplicateCount,
				overlapCount
			}).run();

			// Bulk insert observations if any valid rows parsed
			if (observationRows.length > 0) {
				const chunkSize = 100;
				for (let i = 0; i < observationRows.length; i += chunkSize) {
					const chunk = observationRows.slice(i, i + chunkSize);
					tx.insert(metricObservations).values(chunk).run();
				}
			}
		});

		// Recalculate and invalidate growth leaderboard cache
		try {
			const { invalidateLeaderboardCache } = await import('../growth');
			invalidateLeaderboardCache();
		} catch (cacheErr) {
			// Ignored if file loading order causes import issue in tests
		}

		await logAuditEvent(
			userId,
			username,
			'import_csv_success',
			'import_batch',
			batchId,
			{ rowCount: parsed.rows.length, duplicateCount, overlapCount },
			actorIp
		);

		return {
			batchId,
			rowCount: parsed.rows.length,
			duplicateCount,
			overlapCount,
			warningCount
		};
	} catch (txError: any) {
		console.error('[CSV Pipeline] Database insertion failed. Running compensation actions:', txError);

		// Compensation: Remove moved file from storage
		if (fs.existsSync(finalFilePath)) {
			fs.unlinkSync(finalFilePath);
		}

		// Preserve failed import record
		await db.insert(importBatches).values({
			id: batchId,
			projectId,
			sourceId: draft.sourceId,
			userId,
			originalFilename: originalName,
			storedFilename: null, // Null since file is removed
			fileSize: draftStat.size,
			checksum: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
			detectedImporter: 'manual',
			mappingConfig: JSON.stringify(mappingConfig),
			rowCount: parsed.rows.length,
			warningCount,
			errorCount: errorCount + 1,
			status: 'failed',
			errorMessage: txError.message || 'Database transaction rollback.',
			createdAt: now,
			completedAt: now,
			duplicateCount,
			overlapCount,
			rawFileDeletedAt: now
		});

		await logAuditEvent(
			userId,
			username,
			'import_csv_failed',
			'import_batch',
			batchId,
			{ error: txError.message },
			actorIp
		);

		throw new Error(`Import failed: ${txError.message}`);
	}
}

/**
 * Remove/delete a draft and its temporary file from disk.
 */
export async function cleanupDraft(draftId: string) {
	try {
		const draftRecord = await db.select().from(importDrafts).where(eq(importDrafts.id, draftId)).limit(1);
		if (draftRecord.length > 0) {
			const draft = draftRecord[0];
			const dataDir = process.env.DATA_DIRECTORY || './data';
			const { fileId } = parseStoredFilename(draft.storedFilename);
			const filePath = path.join(dataDir, 'uploads', 'drafts', fileId);
			if (fs.existsSync(filePath)) {
				fs.unlinkSync(filePath);
			}
			await db.delete(importDrafts).where(eq(importDrafts.id, draftId));
		}
	} catch (e) {
		console.error('[CSV Pipeline] Error cleaning up draft:', e);
	}
}

/**
 * Helper to clean up all expired drafts.
 */
export async function cleanupExpiredDrafts() {
	const now = Math.floor(Date.now() / 1000);
	const expired = await db.select().from(importDrafts).where(lte(importDrafts.expiresAt, now));
	
	for (const draft of expired) {
		await cleanupDraft(draft.id);
	}
}
