import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { generateUniqueSlug } from '$lib/server/slugs';
import { getUserLimits } from '$lib/server/limits';
import { logAuditEvent } from '$lib/server/audit';
import { downloadWebsiteFavicon } from '$lib/server/assets';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const { limits, usage } = await getUserLimits(locals.user.id);
	const limitReached = usage.projectsCount >= limits.maxProjects;

	return {
		limitReached,
		maxProjects: limits.maxProjects
	};
};

export const actions: Actions = {
	default: async ({ request, locals, getClientAddress }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		// Re-enforce project limit checks
		const { limits, usage } = await getUserLimits(locals.user.id);
		if (usage.projectsCount >= limits.maxProjects) {
			return fail(400, { error: `Project limit reached. You can only own up to ${limits.maxProjects} projects.` });
		}

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() || '';
		const shortDescription = data.get('shortDescription')?.toString().trim() || '';
		const fullDescription = data.get('fullDescription')?.toString().trim() || '';
		const websiteUrl = data.get('websiteUrl')?.toString().trim() || null;
		const repositoryUrl = data.get('repositoryUrl')?.toString().trim() || null;
		const storeUrl = data.get('storeUrl')?.toString().trim() || null;
		const category = data.get('category')?.toString() as any;
		const visibility = data.get('visibility')?.toString() as any;

		// Input Validation
		if (!name || name.length < 3 || name.length > 100) {
			return fail(400, { error: 'Project name must be between 3 and 100 characters.' });
		}

		if (!shortDescription || shortDescription.length < 5 || shortDescription.length > 200) {
			return fail(400, { error: 'Short description must be between 5 and 200 characters.' });
		}

		if (fullDescription.length > 2000) {
			return fail(400, { error: 'Full description cannot exceed 2000 characters.' });
		}

		const validCategories = ['productivity', 'entertainment', 'developer-tools', 'accessibility', 'privacy', 'social', 'shopping', 'education', 'other'];
		if (!validCategories.includes(category)) {
			return fail(400, { error: 'Invalid project category.' });
		}

		const validVisibilities = ['public', 'unlisted', 'private'];
		if (!validVisibilities.includes(visibility)) {
			return fail(400, { error: 'Invalid visibility mode.' });
		}

		let clientIp = '127.0.0.1';
		try {
			clientIp = getClientAddress() || '127.0.0.1';
		} catch (e) {
			// Ignore
		}

		// Generate Slug & ID
		const slug = await generateUniqueSlug(name);
		const projectId = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);

		let logoPath: string | null = null;
		if (websiteUrl) {
			logoPath = await downloadWebsiteFavicon(projectId, websiteUrl);
		}

		await db.insert(projects).values({
			id: projectId,
			ownerId: locals.user.id,
			name,
			slug,
			shortDescription,
			fullDescription,
			websiteUrl,
			repositoryUrl,
			storeUrl,
			category,
			visibility,
			logoPath,
			leaderboardOptIn: 0,
			leaderboardStatus: 'not_requested',
			verificationStatus: 'unverified',
			moderationStatus: 'active',
			createdAt: now,
			updatedAt: now
		});

		// Audit Log
		await logAuditEvent(
			locals.user.id,
			locals.user.username,
			'create_project',
			'project',
			projectId,
			{ name, slug, visibility },
			clientIp
		);

		throw redirect(302, `/app/projects/${projectId}`);
	}
};
