import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from './db';
import { users, projects } from './db/schema';
import { GET } from '../../routes/p/[slug]/og.png/+server';
import { eq } from 'drizzle-orm';

describe('OG Image PNG Endpoint', () => {
	let testUser: any;
	let testProject: any;

	beforeAll(async () => {
		const now = Math.floor(Date.now() / 1000);

		// Seed user
		const userId = crypto.randomUUID();
		await db.insert(users).values({
			id: userId,
			username: 'ogtestuser',
			normalizedUsername: 'ogtestuser',
			displayName: 'OG Test User',
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
			name: 'OG Test Project',
			slug: 'og-test-project',
			shortDescription: 'Open Graph verification test project',
			fullDescription: 'Full description',
			visibility: 'public',
			category: 'other',
			createdAt: now,
			updatedAt: now
		});
		testProject = (await db.select().from(projects).where(eq(projects.id, projectId)))[0];
	});

	afterAll(async () => {
		if (testProject) {
			await db.delete(projects).where(eq(projects.id, testProject.id));
		}
		if (testUser) {
			await db.delete(users).where(eq(users.id, testUser.id));
		}
	});

	it('should return a binary response with PNG mime type and valid signature', async () => {
		const response = await GET({
			params: { slug: 'og-test-project' },
			locals: {}
		} as any);

		expect(response.status).toBe(200);
		expect(response.headers.get('content-type')).toBe('image/png');

		const arrayBuffer = await response.arrayBuffer();
		const bytes = new Uint8Array(arrayBuffer);

		// Standard 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
		const expectedSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
		
		expect(bytes.length).toBeGreaterThan(8);
		for (let i = 0; i < 8; i++) {
			expect(bytes[i]).toBe(expectedSignature[i]);
		}

		const view = new DataView(arrayBuffer);
		expect(view.getUint32(16)).toBe(1200);
		expect(view.getUint32(20)).toBe(630);
	});

	it('returns 404 for private projects unless the owner is authenticated', async () => {
		await db.update(projects).set({ visibility: 'private' }).where(eq(projects.id, testProject.id));
		await expect(GET({ params: { slug: testProject.slug }, locals: {} } as any)).rejects.toMatchObject({ status: 404 });

		const response = await GET({
			params: { slug: testProject.slug },
			locals: { user: { id: testUser.id } }
		} as any);
		expect(response.status).toBe(200);
	});
});
