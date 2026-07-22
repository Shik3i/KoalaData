import { db } from '$lib/server/db';
import { dataSources, projects } from '$lib/server/db/schema';
import { generateUniqueSlug, slugify } from '$lib/server/slugs';
import { isSqliteUniqueConstraint } from '$lib/server/db/errors';
import { getUserLimits } from '$lib/server/limits';
import { logAuditEvent } from '$lib/server/audit';
import { normalizeChromeStoreUrl, normalizeOptionalHttpsUrl } from '$lib/server/urls';
import { isPricingModel } from '$lib/project-classification';
import { fail, redirect } from '@sveltejs/kit';
import { and, count, eq, isNull } from 'drizzle-orm';
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
		const currentUser = locals.user;

		// Re-enforce project limit checks
		const { limits, usage } = await getUserLimits(currentUser.id);
		if (usage.projectsCount >= limits.maxProjects) {
			return fail(400, { error: `Project limit reached. You can only own up to ${limits.maxProjects} projects.` });
		}

		const data = await request.formData();
		const name = data.get('name')?.toString().trim() || '';
		const shortDescription = data.get('shortDescription')?.toString().trim() || '';
		const fullDescription = data.get('fullDescription')?.toString().trim() || '';
		let websiteUrl: string | null;
		let repositoryUrl: string | null;
		let storeUrl: string | null;
		try {
			websiteUrl = normalizeOptionalHttpsUrl(data.get('websiteUrl')?.toString(), 'Website URL');
			repositoryUrl = normalizeOptionalHttpsUrl(data.get('repositoryUrl')?.toString(), 'Repository URL');
			storeUrl = normalizeChromeStoreUrl(data.get('storeUrl')?.toString());
		} catch (error) {
			return fail(400, { error: error instanceof Error ? error.message : 'Invalid external URL.' });
		}
		const category = data.get('category')?.toString() as any;
		const pricingModel = data.get('pricingModel')?.toString() || '';
		const isOpenSource = data.get('isOpenSource') === 'on' ? 1 : 0;
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
		if (!isPricingModel(pricingModel)) {
			return fail(400, { error: 'Select whether the extension is free, freemium, or paid.' });
		}
		if (isOpenSource && !repositoryUrl) {
			return fail(400, { error: 'Add a public repository URL before marking the extension as open source.' });
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
		let slug = await generateUniqueSlug(name);
		const projectId = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);
		let created = false;
		for (let attempt = 0; attempt < 3 && !created; attempt++) {
			try {
				const outcome = db.transaction((tx) => {
					const owned = tx
						.select({ value: count() })
						.from(projects)
						.where(and(eq(projects.ownerId, currentUser.id), isNull(projects.deletedAt)))
						.get();
					if ((owned?.value ?? 0) >= limits.maxProjects) return 'limit' as const;
					tx.insert(projects).values({
						id: projectId,
						ownerId: currentUser.id,
						name,
						slug,
						shortDescription,
						fullDescription,
						websiteUrl,
						repositoryUrl,
						storeUrl,
						category,
						pricingModel,
						isOpenSource,
						visibility,
						logoPath: null,
						leaderboardOptIn: 0,
						leaderboardStatus: 'not_requested',
						verificationStatus: 'unverified',
						moderationStatus: 'hidden',
						moderationReason: 'Awaiting initial listing review.',
						createdAt: now,
						updatedAt: now
					}).run();

					if (storeUrl) {
						tx.insert(dataSources).values({
							id: crypto.randomUUID(),
							projectId,
							name: 'Chrome Web Store',
							sourceType: 'chrome_web_store',
							externalUrl: storeUrl,
							granularity: 'daily',
							createdAt: now,
							updatedAt: now
						}).run();
					}
					return 'created' as const;
				});
				if (outcome === 'limit') {
					return fail(409, { error: `Project limit reached. You can only own up to ${limits.maxProjects} projects.` });
				}
				created = true;
			} catch (error) {
				if (!isSqliteUniqueConstraint(error) || attempt === 2) throw error;
				slug = `${slugify(name) || 'project'}-${crypto.randomUUID().slice(0, 8)}`;
			}
		}

		// Audit Log
		await logAuditEvent(
			currentUser.id,
			currentUser.username,
			'create_project',
			'project',
			projectId,
			{ name, slug, visibility },
			clientIp
		);

		throw redirect(302, `/app/projects/${projectId}`);
	}
};
