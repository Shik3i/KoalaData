import db from './db';
import { projects } from './db/schema';
import { eq } from 'drizzle-orm';

const RESERVED_SLUGS = new Set([
	'login',
	'register',
	'discover',
	'leaderboards',
	'admin',
	'app',
	'p',
	'api',
	'health',
	'assets',
	'static'
]);

/**
 * Convert a project name to a lowercase, URL-safe slug.
 */
export function slugify(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Generate a unique slug for a project, avoiding collisions and reserved system routes.
 */
export async function generateUniqueSlug(name: string): Promise<string> {
	const base = slugify(name) || 'project';
	let slug = base;
	let counter = 1;

	while (true) {
		if (RESERVED_SLUGS.has(slug)) {
			slug = `${base}-${counter}`;
			counter++;
			continue;
		}

		const existing = await db
			.select()
			.from(projects)
			.where(eq(projects.slug, slug))
			.limit(1);

		if (existing.length === 0) {
			return slug;
		}

		slug = `${base}-${counter}`;
		counter++;
	}
}

/**
 * Check if a custom slug is valid and unique (ignoring the current project ID).
 */
export async function isSlugAvailable(slug: string, excludeProjectId?: string): Promise<boolean> {
	const cleanSlug = slugify(slug);
	
	if (RESERVED_SLUGS.has(cleanSlug)) {
		return false;
	}

	const query = db
		.select()
		.from(projects)
		.where(eq(projects.slug, cleanSlug));
		
	const results = await query;
	
	if (results.length === 0) {
		return true;
	}
	
	if (excludeProjectId && results[0].id === excludeProjectId) {
		return true;
	}

	return false;
}
