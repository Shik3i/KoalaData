import { expect, test, type APIResponse } from '@playwright/test';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

async function readActionResult(response: APIResponse) {
	const body = await response.text();
	const result = JSON.parse(body) as {
		type: 'success' | 'failure' | 'redirect' | 'error';
		status: number;
		data?: string;
		location?: string;
	};
	return { body, result };
}

test('cross-project identifiers and parallel mutations stay isolated', async ({ page }) => {
	test.setTimeout(60_000);
	await page.goto('/login');
	await page.fill('input[name="username"]', 'admin');
	await page.fill('input[name="password"]', 'admin_password');
	await page.click('button[type="submit"]');
	await page.waitForURL('/app');

	const databasePath = process.env.DATABASE_PATH;
	const dataDirectory = process.env.DATA_DIRECTORY;
	if (!databasePath || !dataDirectory) throw new Error('Isolated Playwright paths are missing.');
	const sqlite = new Database(databasePath);
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	const admin = sqlite.prepare("SELECT id FROM users WHERE username = 'admin'").get() as { id: string };
	const now = Math.floor(Date.now() / 1000);
	const projectA = crypto.randomUUID();
	const projectB = crypto.randomUUID();
	const sourceA = crypto.randomUUID();
	const sourceB = crypto.randomUUID();
	const targetA = crypto.randomUUID();
	const targetB = crypto.randomUUID();
	const suffix = crypto.randomUUID().slice(0, 8);
	const targetAName = `transfer_a_${suffix}`;
	const targetBName = `transfer_b_${suffix}`;
	const draftFiles: string[] = [];
	const actionHeaders = {
		origin: 'http://127.0.0.1:4173',
		accept: 'application/json',
		'x-sveltekit-action': 'true'
	};

	const insertProject = sqlite.prepare(`
		INSERT INTO projects (
			id, owner_id, name, slug, short_description, full_description, category,
			pricing_model, is_open_source, visibility, moderation_status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, '', 'developer-tools', 'free', 0, 'public', 'active', ?, ?)
	`);
	const insertSource = sqlite.prepare(`
		INSERT INTO data_sources (id, project_id, name, source_type, granularity, created_at, updated_at)
		VALUES (?, ?, ?, 'generic_csv', 'daily', ?, ?)
	`);
	const insertDraft = (projectId: string, sourceId: string, originalName: string) => {
		const draftId = crypto.randomUUID();
		const fileId = crypto.randomUUID();
		const draftsDirectory = path.join(dataDirectory, 'uploads', 'drafts');
		fs.mkdirSync(draftsDirectory, { recursive: true });
		const filePath = path.join(draftsDirectory, `${fileId}.tmp`);
		fs.writeFileSync(filePath, 'date,users\n2026-07-22,100\n');
		draftFiles.push(filePath);
		sqlite.prepare(`
			INSERT INTO import_drafts (
				id, user_id, project_id, source_id, stored_filename, detected_delimiter,
				detected_encoding, headers, row_count, created_at, expires_at
			) VALUES (?, ?, ?, ?, ?, ',', 'utf-8', '["date","users"]', 1, ?, ?)
		`).run(draftId, admin.id, projectId, sourceId, `${originalName}:::${fileId}.tmp`, now, now + 3600);
		return draftId;
	};

	try {
		sqlite.transaction(() => {
			insertProject.run(projectA, admin.id, 'Isolation A', `isolation-a-${suffix}`, 'Isolation project A', now, now);
			insertProject.run(projectB, admin.id, 'Isolation B', `isolation-b-${suffix}`, 'Isolation project B', now, now);
			insertSource.run(sourceA, projectA, 'Source A', now, now);
			insertSource.run(sourceB, projectB, 'Source B', now, now);
			for (const [id, username] of [[targetA, targetAName], [targetB, targetBName]]) {
				sqlite.prepare(`
					INSERT INTO users (id, username, normalized_username, display_name, password_hash, role, status, created_at, updated_at)
					VALUES (?, ?, ?, ?, 'not-used', 'user', 'active', ?, ?)
				`).run(id, username, username, username, now, now);
			}
		})();

		const crossDraft = insertDraft(projectA, sourceA, 'cross-project.csv');
		const crossDraftResponse = await page.request.get(
			`/app/projects/${projectB}/imports/preview?draftId=${crossDraft}`,
			{ maxRedirects: 0 }
		);
		expect(crossDraftResponse.status()).toBe(302);
		expect(crossDraftResponse.headers().location).toContain('error=draft_not_found');

		const crossSourceResponse = await page.request.post(`/app/projects/${projectA}/imports?/uploadCsv`, {
			headers: actionHeaders,
			multipart: {
				sourceId: sourceB,
				file: { name: 'cross-source.csv', mimeType: 'text/csv', buffer: Buffer.from('date,users\n2026-07-22,5\n') }
			}
		});
		const crossSource = await readActionResult(crossSourceResponse);
		expect(crossSourceResponse.status(), crossSource.body).toBe(200);
		expect(crossSource.result.type).toBe('failure');
		expect(crossSource.result.status).toBe(400);
		expect(crossSource.body).toContain('does not belong to this project');

		const confirmDraft = insertDraft(projectA, sourceA, 'parallel-confirm.csv');
		const confirmForm = {
			draftId: confirmDraft,
			dateColumn: 'date',
			dateFormat: 'YYYY-MM-DD',
			map_col_1: 'true',
			type_col_1: 'active_users',
			name_col_1: 'Weekly users',
			agg_col_1: 'latest'
		};
		const confirmResponses = await Promise.all([
			page.request.post(`/app/projects/${projectA}/imports/preview`, { headers: actionHeaders, form: confirmForm, maxRedirects: 0 }),
			page.request.post(`/app/projects/${projectA}/imports/preview`, { headers: actionHeaders, form: confirmForm, maxRedirects: 0 })
		]);
		const confirmResults = await Promise.all(confirmResponses.map(readActionResult));
		expect(confirmResults.map(({ result }) => result.status).sort()).toEqual([302, 400]);

		const batch = sqlite.prepare('SELECT id FROM import_batches WHERE project_id = ? AND original_filename = ?')
			.get(projectA, 'parallel-confirm.csv') as { id: string };
		const crossBatchResponse = await page.request.post(`/app/projects/${projectB}/imports?/rollbackBatch`, {
			headers: actionHeaders,
			form: { batchId: batch.id }
		});
		const crossBatch = await readActionResult(crossBatchResponse);
		expect(crossBatch.result.type).toBe('failure');
		expect(crossBatch.result.status).toBe(404);

		const rollbackResponses = await Promise.all([
			page.request.post(`/app/projects/${projectA}/imports?/rollbackBatch`, { headers: actionHeaders, form: { batchId: batch.id } }),
			page.request.post(`/app/projects/${projectA}/imports?/rollbackBatch`, { headers: actionHeaders, form: { batchId: batch.id } })
		]);
		const rollbackResults = await Promise.all(rollbackResponses.map(readActionResult));
		expect(rollbackResults.map(({ result }) => result.status).sort()).toEqual([200, 404]);

		const transferResponses = await Promise.all([
			page.request.post(`/app/projects/${projectA}/members?/transferOwnership`, {
				headers: actionHeaders, form: { newOwnerUsername: targetAName, expectedOwnerId: admin.id }, maxRedirects: 0
			}),
			page.request.post(`/app/projects/${projectA}/members?/transferOwnership`, {
				headers: actionHeaders, form: { newOwnerUsername: targetBName, expectedOwnerId: admin.id }, maxRedirects: 0
			})
		]);
		const transferResults = await Promise.all(transferResponses.map(readActionResult));
		expect(transferResults.map(({ result }) => result.status).sort()).toEqual([302, 409]);
	} finally {
		sqlite.prepare('DELETE FROM projects WHERE id IN (?, ?)').run(projectA, projectB);
		sqlite.prepare('DELETE FROM users WHERE id IN (?, ?)').run(targetA, targetB);
		sqlite.close();
		for (const filePath of draftFiles) fs.rmSync(filePath, { force: true });
	}
});
