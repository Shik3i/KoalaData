import db from './db';
import { projectEvents, projects, dataSources, metricDefinitions, metricObservations, importBatches } from './db/schema';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

export type ProjectEventCategory = 'badge' | 'release' | 'marketing' | 'incident' | 'custom';

export interface ProjectEvent {
	id: string;
	projectId: string;
	date: string;
	title: string;
	description: string | null;
	category: ProjectEventCategory;
	icon: string | null;
	isPublished: boolean;
	createdById: string | null;
	createdAt: number;
	updatedAt: number;
}

export interface ProjectEventInput {
	date: string; // YYYY-MM-DD
	title: string;
	description?: string | null;
	category?: ProjectEventCategory;
	icon?: string | null;
	isPublished?: boolean;
}

export interface EventSuggestion {
	id: string;
	date: string;
	title: string;
	description: string;
	category: ProjectEventCategory;
	icon: string;
	source: 'badge' | 'release' | 'growth_spike';
}

/**
 * List events for a project sorted by date ascending.
 */
export async function listProjectEvents(
	projectId: string,
	options: { publishedOnly?: boolean } = {}
): Promise<ProjectEvent[]> {
	const conditions = [eq(projectEvents.projectId, projectId)];
	if (options.publishedOnly) {
		conditions.push(eq(projectEvents.isPublished, 1));
	}

	const rows = await db
		.select()
		.from(projectEvents)
		.where(and(...conditions))
		.orderBy(asc(projectEvents.date), asc(projectEvents.createdAt));

	return rows.map((r) => ({
		id: r.id,
		projectId: r.projectId,
		date: r.date,
		title: r.title,
		description: r.description,
		category: r.category as ProjectEventCategory,
		icon: r.icon,
		isPublished: Boolean(r.isPublished),
		createdById: r.createdById,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt
	}));
}

/**
 * Create a new project event.
 */
export async function createProjectEvent(
	projectId: string,
	createdById: string | null,
	input: ProjectEventInput
): Promise<ProjectEvent> {
	const trimmedTitle = input.title.trim();
	if (!trimmedTitle) {
		throw new Error('Event title cannot be empty.');
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
		throw new Error('Invalid date format. Expected YYYY-MM-DD.');
	}

	const now = Math.floor(Date.now() / 1000);
	const eventId = crypto.randomUUID();
	const category = input.category || 'custom';
	const icon = input.icon?.trim() || defaultIconForCategory(category);
	if (icon.length > 10) {
		throw new Error('Event icon must be 10 characters or fewer.');
	}
	const isPublished = input.isPublished ?? true;

	await db.insert(projectEvents).values({
		id: eventId,
		projectId,
		date: input.date,
		title: trimmedTitle,
		description: input.description?.trim() || null,
		category,
		icon,
		isPublished: isPublished ? 1 : 0,
		createdById,
		createdAt: now,
		updatedAt: now
	});

	const events = await listProjectEvents(projectId);
	const found = events.find((e) => e.id === eventId);
	if (!found) throw new Error('Failed to retrieve newly created event.');
	return found;
}

/**
 * Update an existing project event.
 */
export async function updateProjectEvent(
	eventId: string,
	projectId: string,
	input: Partial<ProjectEventInput>
): Promise<ProjectEvent> {
	const existingList = await listProjectEvents(projectId);
	const existing = existingList.find((e) => e.id === eventId);
	if (!existing) {
		throw new Error('Project event not found.');
	}

	const updates: Record<string, any> = {
		updatedAt: Math.floor(Date.now() / 1000)
	};

	if (input.title !== undefined) {
		const trimmed = input.title.trim();
		if (!trimmed) throw new Error('Event title cannot be empty.');
		updates.title = trimmed;
	}

	if (input.date !== undefined) {
		if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
			throw new Error('Invalid date format. Expected YYYY-MM-DD.');
		}
		updates.date = input.date;
	}

	if (input.description !== undefined) {
		updates.description = input.description?.trim() || null;
	}

	if (input.category !== undefined) {
		updates.category = input.category;
		if (!input.icon) {
			updates.icon = defaultIconForCategory(input.category);
		}
	}

	if (input.icon !== undefined) {
		updates.icon = input.icon;
	}

	if (input.isPublished !== undefined) {
		updates.isPublished = input.isPublished ? 1 : 0;
	}

	await db.update(projectEvents).set(updates).where(and(eq(projectEvents.id, eventId), eq(projectEvents.projectId, projectId)));

	const updated = (await listProjectEvents(projectId)).find((e) => e.id === eventId);
	if (!updated) throw new Error('Failed to retrieve updated event.');
	return updated;
}

/**
 * Delete a project event.
 */
export async function deleteProjectEvent(eventId: string, projectId: string): Promise<void> {
	await db.delete(projectEvents).where(and(eq(projectEvents.id, eventId), eq(projectEvents.projectId, projectId)));
}

/**
 * Generate smart event suggestions based on project history (version releases, badges, spikes).
 */
export async function generateEventSuggestions(projectId: string): Promise<EventSuggestion[]> {
	const suggestions: EventSuggestion[] = [];
	const existingEvents = await listProjectEvents(projectId);
	const existingKeys = new Set(existingEvents.map((e) => `${e.date}:${e.title.toLowerCase()}`));

	// 1. Version Releases from version breakdown observations
	try {
		const versionQuery = sql`
			SELECT 
				json_extract(o.dimensions, '$.version') as version,
				MIN(o.date) as releaseDate
			FROM metric_observations o
			INNER JOIN data_sources s ON o.source_id = s.id
			INNER JOIN import_batches b ON o.import_batch_id = b.id
			WHERE s.project_id = ${projectId}
			  AND o.dimensions LIKE '%"version"%'
			  AND b.status = 'completed'
			  AND b.reverted_at IS NULL
			  AND json_extract(o.dimensions, '$.version') IS NOT NULL
			GROUP BY json_extract(o.dimensions, '$.version')
			ORDER BY releaseDate ASC
		`;
		const versionRows = await db.all<{ version: string; releaseDate: string }>(versionQuery);
		for (const r of versionRows) {
			if (r.version && r.releaseDate) {
				const title = `Version ${r.version.startsWith('v') ? r.version : 'v' + r.version} released`;
				const key = `${r.releaseDate}:${title.toLowerCase()}`;
				if (!existingKeys.has(key)) {
					suggestions.push({
						id: `release-${r.version}`,
						date: r.releaseDate,
						title,
						description: `First detected active users on version ${r.version}.`,
						category: 'release',
						icon: '🚀',
						source: 'release'
					});
				}
			}
		}
	} catch (e) {
		// Ignore if dimension query fails
	}

	// 2. Project Verification / Badge Detection
	try {
		const [proj] = await db.select().from(projects).where(eq(projects.id, projectId));
		if (proj && proj.verificationStatus === 'verified') {
			const date = proj.createdAt ? new Date(proj.createdAt * 1000).toISOString().split('T')[0] : '2026-01-01';
			const title = 'Verified Publisher Badge';
			const key = `${date}:${title.toLowerCase()}`;
			if (!existingKeys.has(key)) {
				suggestions.push({
					id: `badge-verified`,
					date,
					title,
					description: 'Project publisher identity verified on KoalaData.',
					category: 'badge',
					icon: '🏅',
					source: 'badge'
				});
			}
		}
	} catch (e) {
		// Ignore
	}

	// 3. Growth Spikes (Installs > 2.5x 7-day average)
	try {
		const installsQuery = sql`
			SELECT o.date, SUM(o.value) as totalValue
			FROM metric_observations o
			INNER JOIN metric_definitions m ON o.metric_id = m.id
			INNER JOIN data_sources s ON o.source_id = s.id
			INNER JOIN import_batches b ON o.import_batch_id = b.id
			WHERE s.project_id = ${projectId}
			  AND m.metric_type = 'installs'
			  AND b.status = 'completed'
			  AND b.reverted_at IS NULL
			GROUP BY o.date
			ORDER BY o.date ASC
		`;
		const obs = await db.all<{ date: string; totalValue: number }>(installsQuery);
		if (obs.length >= 8) {
			for (let i = 7; i < obs.length; i++) {
				const current = obs[i];
				const prev7 = obs.slice(i - 7, i);
				const avg = prev7.reduce((acc, curr) => acc + curr.totalValue, 0) / 7;
				if (avg > 10 && current.totalValue >= avg * 2.5) {
					const title = `Growth Spike (+${Math.round(((current.totalValue - avg) / avg) * 100)}%)`;
					const key = `${current.date}:${title.toLowerCase()}`;
					if (!existingKeys.has(key)) {
						suggestions.push({
							id: `spike-${current.date}`,
							date: current.date,
							title,
							description: `Daily installs spiked to ${Math.round(current.totalValue)} (7-day avg: ${Math.round(avg)}).`,
							category: 'marketing',
							icon: '📈',
							source: 'growth_spike'
						});
					}
				}
			}
		}
	} catch (e) {
		// Ignore
	}

	return suggestions.sort((a, b) => a.date.localeCompare(b.date));
}

export function defaultIconForCategory(category: ProjectEventCategory): string {
	switch (category) {
		case 'badge':
			return '🏅';
		case 'release':
			return '🚀';
		case 'marketing':
			return '📢';
		case 'incident':
			return '⚠️';
		case 'custom':
		default:
			return '📌';
	}
}
