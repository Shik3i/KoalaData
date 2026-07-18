import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from './db';
import { users, projects, dataSources, metricDefinitions, importBatches, metricObservations } from './db/schema';
import { getEffectiveObservations } from './observations';
import { eq } from 'drizzle-orm';

describe('Observations CTE & Rollback Pipeline', () => {
	let testUser: any;
	let testProject: any;
	let testSource: any;
	let testMetric: any;

	beforeAll(async () => {
		const now = Math.floor(Date.now() / 1000);

		// Seed a test user with all non-null fields
		const userId = crypto.randomUUID();
		await db.insert(users).values({
			id: userId,
			username: 'testobsuser',
			normalizedUsername: 'testobsuser',
			displayName: 'Test Obs User',
			passwordHash: 'dummyhashvalue',
			role: 'user',
			status: 'active',
			createdAt: now,
			updatedAt: now
		});
		const userRecs = await db.select().from(users).where(eq(users.id, userId));
		testUser = userRecs[0];

		// Seed project
		const projectId = crypto.randomUUID();
		await db.insert(projects).values({
			id: projectId,
			ownerId: testUser.id,
			name: 'Test Project Obs',
			slug: 'test-project-obs',
			shortDescription: 'Desc',
			fullDescription: 'Full Desc',
			websiteUrl: null,
			repositoryUrl: null,
			storeUrl: null,
			visibility: 'public',
			category: 'productivity',
			createdAt: now,
			updatedAt: now
		});
		const projRecs = await db.select().from(projects).where(eq(projects.id, projectId));
		testProject = projRecs[0];

		// Seed data source
		const sourceId = crypto.randomUUID();
		await db.insert(dataSources).values({
			id: sourceId,
			projectId: testProject.id,
			name: 'CWS Source',
			sourceType: 'chrome_web_store',
			granularity: 'daily',
			createdAt: now,
			updatedAt: now
		});
		testSource = (await db.select().from(dataSources).where(eq(dataSources.id, sourceId)))[0];

		// Seed metric definition
		const metricId = crypto.randomUUID();
		await db.insert(metricDefinitions).values({
			id: metricId,
			sourceId: testSource.id,
			metricType: 'active_users',
			name: 'Weekly Active Users',
			unit: 'count',
			aggregation: 'avg',
			isCumulative: 0,
			participatesInLeaderboard: 1,
			createdAt: now
		});
		testMetric = (await db.select().from(metricDefinitions).where(eq(metricDefinitions.id, metricId)))[0];
	});

	afterAll(async () => {
		// Clean up only our created records to prevent interference with other parallel tests
		if (testMetric) {
			await db.delete(metricObservations).where(eq(metricObservations.metricId, testMetric.id));
			await db.delete(metricDefinitions).where(eq(metricDefinitions.id, testMetric.id));
		}
		if (testSource) {
			await db.delete(importBatches).where(eq(importBatches.sourceId, testSource.id));
			await db.delete(dataSources).where(eq(dataSources.id, testSource.id));
		}
		if (testProject) {
			await db.delete(projects).where(eq(projects.id, testProject.id));
		}
		if (testUser) {
			await db.delete(users).where(eq(users.id, testUser.id));
		}
	});

	it('should resolve overlapping dates using CTE, and fallback on rollback', async () => {
		const now = Math.floor(Date.now() / 1000);

		// 1. Insert Batch 1: date = 2026-07-18, value = 500
		const batch1Id = crypto.randomUUID();
		await db.insert(importBatches).values({
			id: batch1Id,
			projectId: testProject.id,
			sourceId: testSource.id,
			userId: testUser.id,
			originalFilename: 'batch1.csv',
			fileSize: 100,
			checksum: 'sum1',
			detectedImporter: 'manual',
			mappingConfig: '{}',
			rowCount: 1,
			status: 'completed',
			createdAt: now,
			completedAt: now
		});

		await db.insert(metricObservations).values({
			id: crypto.randomUUID(),
			importBatchId: batch1Id,
			sourceId: testSource.id,
			metricId: testMetric.id,
			date: '2026-07-18',
			value: 500,
			dimensions: '{}',
			createdAt: now
		});

		// Query observations
		let obs = await getEffectiveObservations(testSource.id, testMetric.id);
		expect(obs).toHaveLength(1);
		expect(obs[0].value).toBe(500);

		// 2. Insert Batch 2 (uploaded later): date = 2026-07-18, value = 750
		const batch2Id = crypto.randomUUID();
		await db.insert(importBatches).values({
			id: batch2Id,
			projectId: testProject.id,
			sourceId: testSource.id,
			userId: testUser.id,
			originalFilename: 'batch2.csv',
			fileSize: 100,
			checksum: 'sum2',
			detectedImporter: 'manual',
			mappingConfig: '{}',
			rowCount: 1,
			status: 'completed',
			createdAt: now + 60, // 1 minute later
			completedAt: now + 60
		});

		await db.insert(metricObservations).values({
			id: crypto.randomUUID(),
			importBatchId: batch2Id,
			sourceId: testSource.id,
			metricId: testMetric.id,
			date: '2026-07-18',
			value: 750,
			dimensions: '{}',
			createdAt: now + 60
		});

		// Query again - CTE should deterministically select Batch 2 value (750)
		obs = await getEffectiveObservations(testSource.id, testMetric.id);
		expect(obs).toHaveLength(1);
		expect(obs[0].value).toBe(750);

		// 3. Rollback Batch 2 (only mark batch as reverted; do NOT delete observations!)
		db.transaction((tx) => {
			tx
				.update(importBatches)
				.set({ revertedAt: now + 120 })
				.where(eq(importBatches.id, batch2Id))
				.run();
		});

		// Query again - CTE should revert to Batch 1 value (500)
		obs = await getEffectiveObservations(testSource.id, testMetric.id);
		expect(obs).toHaveLength(1);
		expect(obs[0].value).toBe(500);
	});
});
