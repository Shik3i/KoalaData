import { afterEach, describe, expect, it } from 'vitest';
import db from './db';
import { projectSlugRedirects, projects, users } from './db/schema';
import { generateUniqueSlug, isSlugAvailable } from './slugs';
import { eq } from 'drizzle-orm';

describe('project slug reservations', () => {
	const createdUserIds: string[] = [];
	const createdProjectIds: string[] = [];

	afterEach(async () => {
		for (const id of createdProjectIds.splice(0)) await db.delete(projects).where(eq(projects.id, id));
		for (const id of createdUserIds.splice(0)) await db.delete(users).where(eq(users.id, id));
	});

	it('reserves historical slugs for their project', async () => {
		const now = Math.floor(Date.now() / 1000);
		const userId = crypto.randomUUID();
		const projectId = crypto.randomUUID();
		createdUserIds.push(userId);
		createdProjectIds.push(projectId);
		await db.insert(users).values({
			id: userId,
			username: `slug_${userId.slice(0, 8)}`,
			normalizedUsername: `slug_${userId.slice(0, 8)}`,
			displayName: `slug_${userId.slice(0, 8)}`,
			passwordHash: 'unused',
			role: 'user',
			status: 'active',
			createdAt: now,
			updatedAt: now
		});
		await db.insert(projects).values({
			id: projectId,
			ownerId: userId,
			name: 'Current project',
			slug: `current-${projectId.slice(0, 8)}`,
			shortDescription: 'Current project',
			fullDescription: '',
			category: 'other',
			pricingModel: 'free',
			isOpenSource: 0,
			visibility: 'unlisted',
			createdAt: now,
			updatedAt: now
		});
		const historicalSlug = `historical-${projectId.slice(0, 8)}`;
		await db.insert(projectSlugRedirects).values({
			oldSlug: historicalSlug,
			newSlug: `current-${projectId.slice(0, 8)}`,
			projectId
		});

		expect(await isSlugAvailable(historicalSlug)).toBe(false);
		expect(await isSlugAvailable(historicalSlug, projectId)).toBe(true);
		expect(await generateUniqueSlug(historicalSlug)).toBe(`${historicalSlug}-1`);
	});
});
