import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from './db';
import { users, projects, dataSources, metricDefinitions, importBatches, metricObservations } from './db/schema';
import { getLeaderboard } from './growth';
import { initDb } from './db/setup';
import { eq } from 'drizzle-orm';

describe('Growth Leaderboard Rules', () => {
	let testUser: any;
	let projectStale: any;
	let projectLowStart: any;
	let projectHighStart: any;
	
	let sourceStale: any;
	let sourceLow: any;
	let sourceHigh: any;

	let defStale: any;
	let defLow: any;
	let defHigh: any;

	beforeAll(async () => {
		await initDb();
		const now = Math.floor(Date.now() / 1000);

		// 1. Seed test user
		const userId = crypto.randomUUID();
		await db.insert(users).values({
			id: userId,
			username: 'growthtester',
			normalizedUsername: 'growthtester',
			displayName: 'growthtester',
			passwordHash: 'dummy',
			role: 'user',
			status: 'active',
			createdAt: now,
			updatedAt: now
		});
		testUser = (await db.select().from(users).where(eq(users.id, userId)))[0];

		const insertProject = async (name: string, slug: string) => {
			const id = crypto.randomUUID();
			await db.insert(projects).values({
				id,
				ownerId: testUser.id,
				name,
				slug,
				shortDescription: 'Desc',
				fullDescription: 'Full',
				visibility: 'public',
				category: 'other',
				leaderboardOptIn: 1,
				leaderboardStatus: 'approved',
				createdAt: now,
				updatedAt: now
			});
			return (await db.select().from(projects).where(eq(projects.id, id)))[0];
		};

		const insertSource = (projectId: string, name: string) => {
			const id = crypto.randomUUID();
			return db.insert(dataSources).values({
				id,
				projectId,
				name,
				sourceType: 'chrome_web_store',
				granularity: 'daily',
				createdAt: now,
				updatedAt: now
			}).run();
		};

		const insertDef = (sourceId: string) => {
			const id = crypto.randomUUID();
			return db.insert(metricDefinitions).values({
				id,
				sourceId,
				metricType: 'active_users',
				name: 'WAU',
				unit: 'count',
				aggregation: 'average',
				isCumulative: 0,
				participatesInLeaderboard: 1,
				createdAt: now
			}).run();
		};

		// Project 1: Stale data (20 days old)
		projectStale = await insertProject('Stale Project', 'stale-proj');
		const srcStaleId = crypto.randomUUID();
		await db.insert(dataSources).values({ id: srcStaleId, projectId: projectStale.id, name: 'S1', sourceType: 'generic_csv', granularity: 'daily', createdAt: now, updatedAt: now });
		const defStaleId = crypto.randomUUID();
		await db.insert(metricDefinitions).values({ id: defStaleId, sourceId: srcStaleId, metricType: 'active_users', name: 'WAU', unit: 'count', aggregation: 'average', isCumulative: 0, participatesInLeaderboard: 1, createdAt: now });
		sourceStale = { id: srcStaleId };
		defStale = { id: defStaleId };

		// Project 2: Low starting value (< 25)
		projectLowStart = await insertProject('Low Start Project', 'low-start-proj');
		const srcLowId = crypto.randomUUID();
		await db.insert(dataSources).values({ id: srcLowId, projectId: projectLowStart.id, name: 'S2', sourceType: 'generic_csv', granularity: 'daily', createdAt: now, updatedAt: now });
		const defLowId = crypto.randomUUID();
		await db.insert(metricDefinitions).values({ id: defLowId, sourceId: srcLowId, metricType: 'active_users', name: 'WAU', unit: 'count', aggregation: 'average', isCumulative: 0, participatesInLeaderboard: 1, createdAt: now });
		sourceLow = { id: srcLowId };
		defLow = { id: defLowId };

		// Project 3: High starting value (>= 25)
		projectHighStart = await insertProject('High Start Project', 'high-start-proj');
		const srcHighId = crypto.randomUUID();
		await db.insert(dataSources).values({ id: srcHighId, projectId: projectHighStart.id, name: 'S3', sourceType: 'generic_csv', granularity: 'daily', createdAt: now, updatedAt: now });
		const defHighId = crypto.randomUUID();
		await db.insert(metricDefinitions).values({ id: defHighId, sourceId: srcHighId, metricType: 'active_users', name: 'WAU', unit: 'count', aggregation: 'average', isCumulative: 0, participatesInLeaderboard: 1, createdAt: now });
		sourceHigh = { id: srcHighId };
		defHigh = { id: defHighId };
	});

	afterAll(async () => {
		if (!testUser || !projectStale || !projectLowStart || !projectHighStart) return;

		// Clean up created projects
		const pIds = [projectStale.id, projectLowStart.id, projectHighStart.id];
		await db.delete(metricObservations).where(eq(metricObservations.sourceId, sourceStale.id));
		await db.delete(metricObservations).where(eq(metricObservations.sourceId, sourceLow.id));
		await db.delete(metricObservations).where(eq(metricObservations.sourceId, sourceHigh.id));
		
		await db.delete(importBatches).where(eq(importBatches.projectId, projectStale.id));
		await db.delete(importBatches).where(eq(importBatches.projectId, projectLowStart.id));
		await db.delete(importBatches).where(eq(importBatches.projectId, projectHighStart.id));

		await db.delete(metricDefinitions).where(eq(metricDefinitions.id, defStale.id));
		await db.delete(metricDefinitions).where(eq(metricDefinitions.id, defLow.id));
		await db.delete(metricDefinitions).where(eq(metricDefinitions.id, defHigh.id));

		await db.delete(dataSources).where(eq(dataSources.id, sourceStale.id));
		await db.delete(dataSources).where(eq(dataSources.id, sourceLow.id));
		await db.delete(dataSources).where(eq(dataSources.id, sourceHigh.id));

		for (const id of pIds) {
			await db.delete(projects).where(eq(projects.id, id));
		}
		if (testUser) {
			await db.delete(users).where(eq(users.id, testUser.id));
		}
	});

	it('should exclude stale projects and enforce minimum starting value of 25 for percentage growth', async () => {
		const now = Math.floor(Date.now() / 1000);
		
		const insertObservations = async (sourceId: string, metricId: string, obsList: Array<{ date: string; value: number }>) => {
			const batchId = crypto.randomUUID();
			await db.insert(importBatches).values({
				id: batchId,
				projectId: projectStale.id, // placeholder projectId (not strictly checked by CTE observations)
				sourceId,
				userId: testUser.id,
				originalFilename: 'test.csv',
				fileSize: 10,
				checksum: crypto.randomUUID(),
				detectedImporter: 'manual',
				mappingConfig: '{}',
				rowCount: obsList.length,
				status: 'completed',
				createdAt: now,
				completedAt: now
			});

			for (const o of obsList) {
				await db.insert(metricObservations).values({
					id: crypto.randomUUID(),
					importBatchId: batchId,
					sourceId,
					metricId,
					date: o.date,
					value: o.value,
					dimensions: '{}',
					createdAt: now
				});
			}
		};

		// 1. Add stale observations: data ends 20 days ago
		const staleDate20 = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		const staleDate50 = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		await insertObservations(sourceStale.id, defStale.id, [
			{ date: staleDate50, value: 100 },
			{ date: staleDate20, value: 200 }
		]);

		// 2. Add observations for low starting value: starts at 10, grows to 30 (growth of 20, starting val < 25)
		const todayStr = new Date().toISOString().split('T')[0];
		const past30Str = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
		await insertObservations(sourceLow.id, defLow.id, [
			{ date: past30Str, value: 10 },
			{ date: todayStr, value: 30 }
		]);

		// 3. Add observations for high starting value: starts at 100, grows to 150 (growth of 50, starting val >= 25)
		await insertObservations(sourceHigh.id, defHigh.id, [
			{ date: past30Str, value: 100 },
			{ date: todayStr, value: 150 }
		]);

		// Execute leaderboard calculation
		const board = await getLeaderboard();

		// Verification 1: Stale Project must be excluded entirely from the leaderboard
		const staleItem = board.find(x => x.projectId === projectStale.id);
		expect(staleItem).toBeUndefined();

		// Verification 2: Low start project should be listed, but growthPercent must be 0
		const lowItem = board.find(x => x.projectId === projectLowStart.id);
		expect(lowItem).toBeDefined();
		expect(lowItem!.growth).toBe(20);
		expect(lowItem!.growthPercent).toBe(0);
		expect(lowItem!.lastDataDate).toBe(todayStr);

		// Verification 3: High start project should calculate growthPercent correctly (50%)
		const highItem = board.find(x => x.projectId === projectHighStart.id);
		expect(highItem).toBeDefined();
		expect(highItem!.growth).toBe(50);
		expect(highItem!.growthPercent).toBe(50); // (150-100)/100 = 50%
		expect(highItem!.lastDataDate).toBe(todayStr);
	});
});
