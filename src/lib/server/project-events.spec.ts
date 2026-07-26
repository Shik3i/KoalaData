import { describe, it, expect, beforeEach } from 'vitest';
import db from './db';
import { users, projects, projectEvents } from './db/schema';
import {
	createProjectEvent,
	listProjectEvents,
	updateProjectEvent,
	deleteProjectEvent,
	generateEventSuggestions
} from './project-events';

describe('Project Events Service', () => {
	const testProjectId = 'test-proj-events-1';
	const testUserId = 'test-user-events-1';

	beforeEach(async () => {
		// Clean up
		await db.delete(projectEvents);
		await db.delete(projects);
		await db.delete(users);

		// Seed user & project
		const now = Math.floor(Date.now() / 1000);
		await db.insert(users).values({
			id: testUserId,
			username: 'eventowner',
			normalizedUsername: 'eventowner',
			displayName: 'Event Owner',
			passwordHash: 'hash',
			role: 'user',
			status: 'active',
			createdAt: now,
			updatedAt: now
		});

		await db.insert(projects).values({
			id: testProjectId,
			ownerId: testUserId,
			name: 'Event Test Project',
			slug: 'event-test-project',
			shortDescription: 'Short desc',
			fullDescription: 'Full desc',
			category: 'productivity',
			visibility: 'public',
			verificationStatus: 'verified',
			createdAt: now,
			updatedAt: now
		});
	});

	it('creates, lists, updates, and deletes project events', async () => {
		const created = await createProjectEvent(testProjectId, testUserId, {
			date: '2026-05-15',
			title: 'Featured Badge Received',
			description: 'App featured on store frontpage.',
			category: 'badge'
		});

		expect(created.id).toBeDefined();
		expect(created.title).toBe('Featured Badge Received');
		expect(created.date).toBe('2026-05-15');
		expect(created.category).toBe('badge');
		expect(created.icon).toBe('🏅');
		expect(created.isPublished).toBe(true);

		const events = await listProjectEvents(testProjectId);
		expect(events.length).toBe(1);
		expect(events[0].id).toBe(created.id);

		// Update
		const updated = await updateProjectEvent(created.id, testProjectId, {
			title: 'Featured Badge Received (Official)',
			isPublished: false
		});
		expect(updated.title).toBe('Featured Badge Received (Official)');
		expect(updated.isPublished).toBe(false);

		// Check published filter
		const publishedEvents = await listProjectEvents(testProjectId, { publishedOnly: true });
		expect(publishedEvents.length).toBe(0);

		// Delete
		await deleteProjectEvent(created.id, testProjectId);
		const remaining = await listProjectEvents(testProjectId);
		expect(remaining.length).toBe(0);
	});

	it('generates event suggestions based on project status', async () => {
		const suggestions = await generateEventSuggestions(testProjectId);
		expect(suggestions.length).toBeGreaterThan(0);
		const badgeSuggestion = suggestions.find((s) => s.category === 'badge');
		expect(badgeSuggestion).toBeDefined();
		expect(badgeSuggestion?.title).toContain('Verified Publisher Badge');

		// Confirm suggestion by creating event with same date and title
		await createProjectEvent(testProjectId, testUserId, {
			date: badgeSuggestion!.date,
			title: badgeSuggestion!.title,
			category: badgeSuggestion!.category
		});

		// Now suggestions should exclude confirmed item
		const newSuggestions = await generateEventSuggestions(testProjectId);
		const match = newSuggestions.find((s) => s.title === badgeSuggestion?.title);
		expect(match).toBeUndefined();
	});

	it('calculates event impact or handles insufficient data gracefully', async () => {
		const created = await createProjectEvent(testProjectId, testUserId, {
			date: '2026-05-15',
			title: 'Marketing Push',
			category: 'marketing'
		});

		expect(created.impact).toBeDefined();
		expect(created.impact?.status).toBe('insufficient_data');
		expect(created.impact?.summaryText).toBe('Auswertung ausstehend');
	});
});
