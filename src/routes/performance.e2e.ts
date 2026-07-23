import { expect, test } from '@playwright/test';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

test('warm public TTFB stays below 500ms with 50,000 observations', async ({ request }, testInfo) => {
	test.setTimeout(60_000);
	const databasePath = process.env.DATABASE_PATH;
	if (!databasePath) throw new Error('Isolated Playwright database path is missing.');
	const sqlite = new Database(databasePath);
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	const admin = sqlite.prepare("SELECT id FROM users WHERE username = 'admin'").get() as { id: string };
	const now = Math.floor(Date.now() / 1000);
	const projectId = crypto.randomUUID();
	const sourceId = crypto.randomUUID();
	const batchId = crypto.randomUUID();
	const slug = `performance-${crypto.randomUUID().slice(0, 8)}`;
	const metricIds = Array.from({ length: 10 }, () => crypto.randomUUID());

	try {
		sqlite.transaction(() => {
			sqlite.prepare(`
				INSERT INTO projects (
					id, owner_id, name, slug, short_description, full_description, category,
					pricing_model, is_open_source, visibility, moderation_status, created_at, updated_at
				) VALUES (?, ?, 'Performance fixture', ?, 'Realistic public performance fixture', '',
					'developer-tools', 'free', 0, 'public', 'active', ?, ?)
			`).run(projectId, admin.id, slug, now, now);
			sqlite.prepare(`
				INSERT INTO data_sources (id, project_id, name, source_type, granularity, created_at, updated_at)
				VALUES (?, ?, 'Performance source', 'generic_csv', 'daily', ?, ?)
			`).run(sourceId, projectId, now, now);
			const insertMetric = sqlite.prepare(`
				INSERT INTO metric_definitions (
					id, source_id, metric_type, name, unit, aggregation, is_cumulative,
					participates_in_leaderboard, created_at
				) VALUES (?, ?, ?, ?, 'count', 'latest', 0, ?, ?)
			`);
			metricIds.forEach((metricId, index) => insertMetric.run(
				metricId,
				sourceId,
				index === 0 ? 'active_users' : 'custom',
				`Performance metric ${index + 1}`,
				index === 0 ? 1 : 0,
				now
			));
			sqlite.prepare(`
				INSERT INTO import_batches (
					id, project_id, source_id, user_id, original_filename, file_size, checksum,
					detected_importer, mapping_config, row_count, status, created_at, completed_at
				) VALUES (?, ?, ?, ?, 'performance.csv', 1, 'fixture', 'manual', '{}', 5000,
					'completed', ?, ?)
			`).run(batchId, projectId, sourceId, admin.id, now, now);
			const insertObservation = sqlite.prepare(`
				INSERT INTO metric_observations (
					id, import_batch_id, source_id, metric_id, date, value, dimensions, created_at
				) VALUES (?, ?, ?, ?, ?, ?, '{}', ?)
			`);
			const end = new Date();
			end.setUTCHours(0, 0, 0, 0);
			for (let day = 0; day < 5000; day++) {
				const date = new Date(end.getTime() - (4999 - day) * 86_400_000).toISOString().slice(0, 10);
				metricIds.forEach((metricId, metricIndex) => {
					insertObservation.run(
						`${projectId}-${metricIndex}-${day}`,
						batchId,
						sourceId,
						metricId,
						date,
						day + metricIndex,
						now
					);
				});
			}
		})();

		const measurements: Record<string, number[]> = {};
		for (const route of ['/', '/discover', '/leaderboards', `/p/${slug}`]) {
			expect((await request.get(route)).status()).toBe(200);
			const samples: number[] = [];
			for (let run = 0; run < 3; run++) {
				const started = performance.now();
				const response = await request.get(route);
				samples.push(Math.round((performance.now() - started) * 100) / 100);
				expect(response.status()).toBe(200);
			}
			measurements[route] = samples;
			console.log(`PUBLIC_TTFB_MS ${route} ${samples.join(',')}`);
			for (const sample of samples) expect(sample).toBeLessThan(500);
		}
		await testInfo.attach('public-ttfb.json', {
			body: JSON.stringify({ observations: 50_000, samplesMs: measurements }),
			contentType: 'application/json'
		});
	} finally {
		sqlite.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
		sqlite.close();
	}
});
