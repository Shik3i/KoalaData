import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../db';
import { users, projects, dataSources, importDrafts } from '../db/schema';
import { createImportDraft, confirmImportDraft, cleanupExpiredDrafts } from './pipeline';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

describe('CSV Import Draft Lifecycle & Cleanup', () => {
	let testUser: any;
	let testProject: any;
	let testSource: any;

	beforeAll(async () => {
		const now = Math.floor(Date.now() / 1000);

		// Seed user
		const userId = crypto.randomUUID();
		await db.insert(users).values({
			id: userId,
			username: 'drafttestuser',
			normalizedUsername: 'drafttestuser',
			displayName: 'Draft Test User',
			passwordHash: 'dummy',
			role: 'user',
			status: 'active',
			createdAt: now,
			updatedAt: now
		});
		testUser = (await db.select().from(users).where(eq(users.id, userId)))[0];

		// Seed project
		const projectId = crypto.randomUUID();
		await db.insert(projects).values({
			id: projectId,
			ownerId: testUser.id,
			name: 'Draft Project',
			slug: 'draft-project',
			shortDescription: 'Short',
			fullDescription: 'Full',
			visibility: 'public',
			category: 'other',
			createdAt: now,
			updatedAt: now
		});
		testProject = (await db.select().from(projects).where(eq(projects.id, projectId)))[0];

		// Seed data source
		const sourceId = crypto.randomUUID();
		await db.insert(dataSources).values({
			id: sourceId,
			projectId: testProject.id,
			name: 'Draft Source',
			sourceType: 'generic_csv',
			granularity: 'daily',
			createdAt: now,
			updatedAt: now
		});
		testSource = (await db.select().from(dataSources).where(eq(dataSources.id, sourceId)))[0];
	});

	afterAll(async () => {
		if (testSource) {
			await db.delete(dataSources).where(eq(dataSources.id, testSource.id));
		}
		if (testProject) {
			await db.delete(projects).where(eq(projects.id, testProject.id));
		}
		if (testUser) {
			await db.delete(users).where(eq(users.id, testUser.id));
		}
	});

	it('should create draft on disk, throw error when expired, and delete files on cleanup', async () => {
		const csvData = `date,active_users\n2026-07-01,150\n2026-07-02,160`;
		const buffer = Buffer.from(csvData, 'utf-8');

		// 1. Create draft
		const draftId = await createImportDraft(
			testUser.id,
			testProject.id,
			testSource.id,
			'test_draft.csv',
			buffer
		);

		const draftRecord = (await db.select().from(importDrafts).where(eq(importDrafts.id, draftId)))[0];
		expect(draftRecord).toBeDefined();
		expect(draftRecord.rowCount).toBe(2);

		const dataDir = process.env.DATA_DIRECTORY || './data';
		const fileId = draftRecord.storedFilename.includes(':::') ? draftRecord.storedFilename.split(':::')[1] : draftRecord.storedFilename;
		const draftFilePath = path.join(dataDir, 'uploads', 'drafts', fileId);
		
		// Assert file exists on disk
		expect(fs.existsSync(draftFilePath)).toBe(true);

		// 2. Artificially expire draft in database (subtract TTL)
		await db
			.update(importDrafts)
			.set({ expiresAt: Math.floor(Date.now() / 1000) - 60 })
			.where(eq(importDrafts.id, draftId));

		// 3. Try to confirm expired draft -> should throw error
		const mappingConfig = {
			dateColumn: 'date',
			dateFormat: 'YYYY-MM-DD',
			metrics: [
				{
					columnName: 'active_users',
					metricType: 'active_users',
					name: 'Weekly Active Users',
					unit: 'count',
					aggregation: 'avg',
					isCumulative: false
				}
			]
		};

		await expect(
			confirmImportDraft(testUser.id, testUser.username, testProject.id, draftId, mappingConfig)
		).rejects.toThrow('Import draft has expired');

		// 4. Run cleanup job
		await cleanupExpiredDrafts();

		// Assert database record is gone
		const cleanedDraft = (await db.select().from(importDrafts).where(eq(importDrafts.id, draftId)))[0];
		expect(cleanedDraft).toBeUndefined();

		// Assert temporary file is deleted from disk
		expect(fs.existsSync(draftFilePath)).toBe(false);
	});
});
