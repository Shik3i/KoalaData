import { db } from '$lib/server/db';
import { dataSources, projects, projectSlugRedirects } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { assertProjectAccess } from '$lib/server/permissions';
import { isSlugAvailable, slugify } from '$lib/server/slugs';
import { saveProjectLogo, removeProjectLogo } from '$lib/server/assets';
import { normalizeChromeStoreUrl, normalizeOptionalHttpsUrl } from '$lib/server/urls';
import { logAuditEvent } from '$lib/server/audit';
import { isPricingModel } from '$lib/project-classification';
import { isSqliteUniqueConstraint } from '$lib/server/db/errors';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { project, membershipRole } = await parent();
	return {
		project,
		membershipRole
	};
};

export const actions: Actions = {
	updateSettings: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		// Assert access: Must be Owner or Admin
		const { project } = await assertProjectAccess(locals.user.id, projectId, 'owner');

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
			return fail(400, { error: 'Invalid category.' });
		}
		if (!isPricingModel(pricingModel)) {
			return fail(400, { error: 'Select whether the extension is free, freemium, or paid.' });
		}
		if (isOpenSource && !repositoryUrl) {
			return fail(400, { error: 'Add a public repository URL before marking the extension as open source.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		// Retire legacy Google-fetched favicons when the website changes. New logos
		// are uploaded explicitly so project metadata is never sent to a third party.
		const retiredLogoCandidate = project.logoPath?.includes('-favicon-') && project.websiteUrl !== websiteUrl
			? project.logoPath
			: null;

		const now = Math.floor(Date.now() / 1000);
		const updateResult = db.transaction((tx) => {
			const current = tx.select({ logoPath: projects.logoPath }).from(projects)
				.where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).get();
			if (!current) return { updated: false, retiredLogoPath: null as string | null };
			const retiredLogoPath = current.logoPath === retiredLogoCandidate ? retiredLogoCandidate : null;
			const projectUpdate = tx.update(projects).set({
				name,
				shortDescription,
				fullDescription,
				websiteUrl,
				repositoryUrl,
				storeUrl,
				category,
				pricingModel,
				isOpenSource,
				...(retiredLogoPath ? { logoPath: null } : {}),
				updatedAt: now
			}).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).run();
			if (projectUpdate.changes === 0) return { updated: false, retiredLogoPath: null as string | null };

			const existingChromeSource = tx.select({ id: dataSources.id })
				.from(dataSources)
				.where(and(eq(dataSources.projectId, projectId), eq(dataSources.sourceType, 'chrome_web_store')))
				.limit(1)
				.get();

			if (existingChromeSource) {
				tx.update(dataSources).set({ externalUrl: storeUrl, updatedAt: now })
					.where(eq(dataSources.id, existingChromeSource.id)).run();
			} else if (storeUrl) {
				tx.insert(dataSources).values({
					id: crypto.randomUUID(), projectId, name: 'Chrome Web Store',
					sourceType: 'chrome_web_store', externalUrl: storeUrl,
					granularity: 'daily', createdAt: now, updatedAt: now
				}).run();
			}
			return { updated: true, retiredLogoPath };
		});
		if (!updateResult.updated) return fail(404, { error: 'Project no longer exists.' });
		if (updateResult.retiredLogoPath) removeProjectLogo(updateResult.retiredLogoPath);

		await logAuditEvent(locals.user.id, locals.user.username, 'update_project_settings', 'project', projectId, {}, ip);

		return { success: 'General settings updated.' };
	},

	updateVisibility: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		const { project } = await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const visibility = data.get('visibility')?.toString() as any;

		const validVisibilities = ['public', 'unlisted', 'private'];
		if (!validVisibilities.includes(visibility)) {
			return fail(400, { error: 'Invalid visibility mode.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		const needsReview = visibility === 'public'
			&& project.visibility !== 'public'
			&& project.moderationStatus !== 'banned';

		const updated = await db
			.update(projects)
			.set({
				visibility,
				leaderboardOptIn: visibility === 'public' ? project.leaderboardOptIn : 0,
				leaderboardStatus: visibility === 'public' ? project.leaderboardStatus : 'not_requested',
				moderationStatus: needsReview ? 'hidden' : project.moderationStatus,
				moderationReason: needsReview ? 'Awaiting public listing review.' : project.moderationReason,
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
			.returning({ id: projects.id });
		if (updated.length === 0) return fail(404, { error: 'Project no longer exists.' });

		await logAuditEvent(locals.user.id, locals.user.username, 'update_project_visibility', 'project', projectId, { visibility }, ip);

		return {
			success: needsReview
				? 'Public visibility requested. The dashboard remains available to project members while its directory listing is reviewed.'
				: `Project visibility updated to ${visibility}.`
		};
	},

	updateSlug: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		const { project } = await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const newSlug = slugify(data.get('slug')?.toString() || '');

		if (!newSlug || newSlug.length < 3 || newSlug.length > 100) {
			return fail(400, { error: 'Slug must be between 3 and 100 URL-safe characters.' });
		}

		const oldSlug = project.slug;

		if (oldSlug === newSlug) {
			return { success: 'Slug remained unchanged.' };
		}

		// Verify availability
		const available = await isSlugAvailable(newSlug, projectId);
		if (!available) {
			return fail(400, { error: 'This slug is already in use or reserved by the system.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		// Update inside transaction
		try {
			const updated = db.transaction((tx) => {
				// Update project slug
				const projectUpdate = tx
					.update(projects)
				.set({
					slug: newSlug,
					updatedAt: Math.floor(Date.now() / 1000)
				})
					.where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
					.run();
				if (projectUpdate.changes === 0) return false;

				// Record redirect from old slug
				tx
				.insert(projectSlugRedirects)
				.values({
					oldSlug,
					newSlug,
					projectId
				})
				.onConflictDoUpdate({
					target: projectSlugRedirects.oldSlug,
					set: { newSlug, projectId }
					})
					.run();
				return true;
			});
			if (!updated) return fail(404, { error: 'Project no longer exists.' });
		} catch (error) {
			if (isSqliteUniqueConstraint(error)) {
				return fail(409, { error: 'This slug was claimed by another project. Choose a different slug.' });
			}
			throw error;
		}

		await logAuditEvent(locals.user.id, locals.user.username, 'update_project_slug', 'project', projectId, { oldSlug, newSlug }, ip);

		return { success: `Project URL slug updated to "${newSlug}". Links to the old slug will redirect here.` };
	},

	updateLeaderboardOptIn: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		const { project } = await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const optIn = data.get('leaderboardOptIn')?.toString() === 'true';
		if (optIn && project.visibility !== 'public') {
			return fail(400, { error: 'Only public projects can participate in leaderboards.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		// If opting in, and status was not requested, set to pending review
		const leaderboardStatus = optIn && project.leaderboardStatus === 'not_requested'
			? 'pending'
			: (optIn ? project.leaderboardStatus : 'not_requested');

		const updated = await db
			.update(projects)
			.set({
				leaderboardOptIn: optIn ? 1 : 0,
				leaderboardStatus,
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
			.returning({ id: projects.id });
		if (updated.length === 0) return fail(404, { error: 'Project no longer exists.' });

		await logAuditEvent(locals.user.id, locals.user.username, 'update_project_leaderboards', 'project', projectId, { optIn, status: leaderboardStatus }, ip);

		return { success: optIn ? 'Opted in to leaderboards. Admin review pending.' : 'Opted out of leaderboards.' };
	},

	uploadLogo: async ({ request, params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		await assertProjectAccess(locals.user.id, projectId, 'owner');

		const data = await request.formData();
		const file = data.get('logo') as File;

		if (!file || file.size === 0) {
			return fail(400, { error: 'No logo file provided.' });
		}

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		try {
			// Save new logo
			const filename = await saveProjectLogo(projectId, file);
			let previousLogoPath: string | null = null;
			try {
				const updated = db.transaction((tx) => {
					const current = tx.select({ logoPath: projects.logoPath }).from(projects)
						.where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).get();
					if (!current) return false;
					previousLogoPath = current.logoPath;
					tx.update(projects).set({
						logoPath: filename,
						updatedAt: Math.floor(Date.now() / 1000)
					}).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).run();
					return true;
				});
				if (!updated) {
					removeProjectLogo(filename);
					return fail(404, { error: 'Project no longer exists.' });
				}
			} catch (error) {
				removeProjectLogo(filename);
				throw error;
			}

			if (previousLogoPath) removeProjectLogo(previousLogoPath);

			await logAuditEvent(locals.user.id, locals.user.username, 'upload_project_logo', 'project', projectId, { filename }, ip);

			return { success: 'Logo uploaded successfully.' };
		} catch (e: any) {
			return fail(400, { error: e.message || 'Logo upload failed.' });
		}
	},

	deleteLogo: async ({ params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		await assertProjectAccess(locals.user.id, projectId, 'owner');

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		const deletion = db.transaction((tx) => {
			const current = tx.select({ logoPath: projects.logoPath }).from(projects)
				.where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).get();
			if (!current) return { status: 'missing' as const, logoPath: null };
			if (!current.logoPath) return { status: 'empty' as const, logoPath: null };
			tx.update(projects).set({
				logoPath: null,
				updatedAt: Math.floor(Date.now() / 1000)
			}).where(and(eq(projects.id, projectId), isNull(projects.deletedAt))).run();
			return { status: 'deleted' as const, logoPath: current.logoPath };
		});
		if (deletion.status === 'missing') return fail(404, { error: 'Project no longer exists.' });
		if (deletion.status === 'empty') return fail(400, { error: 'No logo exists to delete.' });
		removeProjectLogo(deletion.logoPath!);

		await logAuditEvent(locals.user.id, locals.user.username, 'delete_project_logo', 'project', projectId, {}, ip);

		return { success: 'Logo deleted successfully.' };
	},

	deleteProject: async ({ params, locals, getClientAddress }) => {
		const projectId = params.id;
		if (!locals.user) return fail(401);

		await assertProjectAccess(locals.user.id, projectId, 'owner');

		let ip = '127.0.0.1';
		try { ip = getClientAddress() || '127.0.0.1'; } catch(e) {}

		const updated = await db
			.update(projects)
			.set({
				deletedAt: Math.floor(Date.now() / 1000),
				updatedAt: Math.floor(Date.now() / 1000)
			})
			.where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
			.returning({ id: projects.id });
		if (updated.length === 0) return fail(404, { error: 'Project no longer exists.' });

		await logAuditEvent(locals.user.id, locals.user.username, 'delete_project', 'project', projectId, {}, ip);

		throw redirect(302, '/app');
	}
};
