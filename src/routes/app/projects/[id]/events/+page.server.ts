import { assertProjectAccess } from '$lib/server/permissions';
import {
	listProjectEvents,
	createProjectEvent,
	updateProjectEvent,
	deleteProjectEvent,
	generateEventSuggestions,
	type ProjectEventCategory
} from '$lib/server/project-events';
import { logAuditEvent } from '$lib/server/audit';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const userId = locals.user?.id || null;
	const { project } = await assertProjectAccess(userId, params.id, 'editor');
	const events = await listProjectEvents(params.id);
	const suggestions = await generateEventSuggestions(params.id);

	return {
		project,
		events,
		suggestions
	};
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		const userId = locals.user?.id || null;
		if (!locals.user) {
			return fail(401, { error: 'Authentication required.' });
		}
		await assertProjectAccess(userId, params.id, 'editor');

		const data = await request.formData();

		const date = data.get('date')?.toString() || '';
		const title = data.get('title')?.toString() || '';
		const description = data.get('description')?.toString() || '';
		const category = (data.get('category')?.toString() || 'custom') as ProjectEventCategory;
		const icon = data.get('icon')?.toString() || '';
		const isPublished = data.get('isPublished') === 'true';

		if (!title.trim()) {
			return fail(400, { error: 'Event title is required.' });
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return fail(400, { error: 'Valid date (YYYY-MM-DD) is required.' });
		}

		try {
			const event = await createProjectEvent(params.id, locals.user.id, {
				date,
				title,
				description,
				category,
				icon,
				isPublished
			});

			await logAuditEvent(
				locals.user.id,
				locals.user.username,
				'create_event',
				'project_event',
				event.id,
				{
					projectId: params.id,
					title: event.title,
					date: event.date
				}
			);

			return { success: true, action: 'create' };
		} catch (err: any) {
			return fail(400, { error: err.message || 'Could not create event.' });
		}
	},

	update: async ({ request, locals, params }) => {
		const userId = locals.user?.id || null;
		if (!locals.user) {
			return fail(401, { error: 'Authentication required.' });
		}
		await assertProjectAccess(userId, params.id, 'editor');

		const data = await request.formData();

		const id = data.get('id')?.toString() || '';
		const date = data.get('date')?.toString();
		const title = data.get('title')?.toString();
		const description = data.get('description')?.toString();
		const category = data.get('category')?.toString() as ProjectEventCategory | undefined;
		const icon = data.get('icon')?.toString();
		const isPublished = data.has('isPublished')
			? data.get('isPublished') === 'true'
			: data.has('isPublishedPresent')
				? false
				: undefined;

		if (!id) {
			return fail(400, { error: 'Event ID is required.' });
		}

		try {
			await updateProjectEvent(id, params.id, {
				date,
				title,
				description,
				category,
				icon,
				isPublished
			});

			await logAuditEvent(
				locals.user.id,
				locals.user.username,
				'update_event',
				'project_event',
				id,
				{ projectId: params.id, title, date, isPublished }
			);

			return { success: true, action: 'update' };
		} catch (err: any) {
			return fail(400, { error: err.message || 'Could not update event.' });
		}
	},

	delete: async ({ request, locals, params }) => {
		const userId = locals.user?.id || null;
		if (!locals.user) {
			return fail(401, { error: 'Authentication required.' });
		}
		await assertProjectAccess(userId, params.id, 'editor');

		const data = await request.formData();
		const id = data.get('id')?.toString() || '';

		if (!id) {
			return fail(400, { error: 'Event ID is required.' });
		}

		try {
			await deleteProjectEvent(id, params.id);

			await logAuditEvent(
				locals.user.id,
				locals.user.username,
				'delete_event',
				'project_event',
				id,
				{ projectId: params.id }
			);

			return { success: true, action: 'delete' };
		} catch (err: any) {
			return fail(400, { error: err.message || 'Could not delete event.' });
		}
	}
};
