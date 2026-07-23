import { expect, test } from '@playwright/test';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

const PRIMARY_METRICS = [
	['active_users', 'Weekly Users', 'average'],
	['installs', 'Daily Installs', 'sum'],
	['uninstalls', 'Daily Uninstalls', 'sum'],
	['store_page_views', 'Store Page Views', 'sum'],
	['store_impressions', 'Store Impressions', 'sum']
] as const;

function numbered(report: string, count: number, label: (index: number) => string): string[] {
	return Array.from({ length: count }, (_, index) => `${report}: ${label(index)}`);
}

const BREAKDOWN_METRICS = [
	...numbered('Tägliche Nutzer nach Erweiterungsversion', 40, (index) => `2.${Math.floor(index / 10)}.${index % 10}.0`),
	...numbered('Installationen nach Region', 50, (index) => `Region ${index + 1}`),
	...numbered('Wöchentliche Nutzer nach Region', 40, (index) => `Region ${index + 1}`),
	...numbered('Installationen nach Sprache', 20, (index) => `Sprache ${index + 1}`),
	...numbered('Wöchentliche Nutzer nach Sprache', 20, (index) => `Sprache ${index + 1}`),
	...numbered('Installationen nach Betriebssystem', 5, (index) => `OS ${index + 1}`),
	...numbered('Wöchentliche Nutzer nach Betriebssystem', 5, (index) => `OS ${index + 1}`),
	...numbered('Deinstallationen nach Region', 10, (index) => `Region ${index + 1}`),
	...['Ein Stern', 'Zwei Sterne', 'Drei Sterne', 'Vier Sterne', 'Fünf Sterne'].map((label) => `Bewertungen im Zeitverlauf: ${label}`),
	'Aktiviert im Vergleich zu deaktiviert: Aktiviert',
	'Aktiviert im Vergleich zu deaktiviert: Deaktiviert',
	...numbered('Deinstallationen nach Betriebssystem', 3, (index) => `OS ${index + 1}`)
];

test('public requests stay compact and fast with realistic 50,000-observation imports', async ({ page, request }, testInfo) => {
	test.setTimeout(90_000);
	expect(BREAKDOWN_METRICS).toHaveLength(200);
	const databasePath = process.env.DATABASE_PATH;
	if (!databasePath) throw new Error('Isolated Playwright database path is missing.');
	const sqlite = new Database(databasePath);
	sqlite.pragma('foreign_keys = ON');
	sqlite.pragma('busy_timeout = 5000');
	const admin = sqlite.prepare("SELECT id FROM users WHERE username = 'admin'").get() as { id: string };
	const now = Math.floor(Date.now() / 1000);
	const projectId = crypto.randomUUID();
	const sourceId = crypto.randomUUID();
	const batchIds = [crypto.randomUUID(), crypto.randomUUID()];
	const slug = `performance-${crypto.randomUUID().slice(0, 8)}`;
	const metricDefinitions = [
		...PRIMARY_METRICS.map(([metricType, name, aggregation]) => ({ id: crypto.randomUUID(), metricType, name, aggregation })),
		...BREAKDOWN_METRICS.map((name) => ({ id: crypto.randomUUID(), metricType: 'custom', name, aggregation: 'sum' }))
	];

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
				VALUES (?, ?, 'Chrome Web Store Export', 'chrome_web_store', 'daily', ?, ?)
			`).run(sourceId, projectId, now, now);
			const insertMetric = sqlite.prepare(`
				INSERT INTO metric_definitions (
					id, source_id, metric_type, name, unit, aggregation, is_cumulative,
					participates_in_leaderboard, created_at
				) VALUES (?, ?, ?, ?, 'count', ?, 0, ?, ?)
			`);
			metricDefinitions.forEach((metric) => insertMetric.run(
				metric.id,
				sourceId,
				metric.metricType,
				metric.name,
				metric.aggregation,
				metric.metricType === 'active_users' ? 1 : 0,
				now
			));
			const insertBatch = sqlite.prepare(`
				INSERT INTO import_batches (
					id, project_id, source_id, user_id, original_filename, file_size, checksum,
					detected_importer, mapping_config, row_count, status, created_at, completed_at
				) VALUES (?, ?, ?, ?, ?, 1, ?, 'chrome_web_store', '{}', 0, 'completed', ?, ?)
			`);
			batchIds.forEach((batchId, index) => insertBatch.run(
				batchId,
				projectId,
				sourceId,
				admin.id,
				`performance-${index + 1}.csv`,
				`fixture-${index + 1}`,
				now - 2 + index,
				now - 2 + index
			));
			const insertObservation = sqlite.prepare(`
				INSERT INTO metric_observations (
					id, import_batch_id, source_id, metric_id, date, value, dimensions, created_at
				) VALUES (?, ?, ?, ?, ?, ?, '{}', ?)
			`);
			const end = new Date();
			end.setUTCHours(0, 0, 0, 0);
			const batchRows = [0, 0];
			metricDefinitions.forEach((metric, metricIndex) => {
				const dayCount = metricIndex < PRIMARY_METRICS.length ? 600 : 235;
				for (let day = 0; day < dayCount; day++) {
					const date = new Date(end.getTime() - (dayCount - 1 - day) * 86_400_000).toISOString().slice(0, 10);
					const batchIndex = day < Math.ceil(dayCount / 2) ? 0 : 1;
					insertObservation.run(
						`${projectId}-${metricIndex}-${day}`,
						batchIds[batchIndex],
						sourceId,
						metric.id,
						date,
						(metricIndex + 1) * ((day % 17) + 1),
						now
					);
					batchRows[batchIndex]++;
				}
			});
			const updateBatchRows = sqlite.prepare('UPDATE import_batches SET row_count = ? WHERE id = ?');
			batchIds.forEach((batchId, index) => updateBatchRows.run(batchRows[index], batchId));
		})();

		const observationCount = sqlite.prepare('SELECT COUNT(*) AS count FROM metric_observations WHERE source_id = ?').get(sourceId) as { count: number };
		expect(observationCount.count).toBe(50_000);

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

		const dashboardResponse = await request.get(`/p/${slug}`);
		const dashboardBytes = (await dashboardResponse.body()).byteLength;
		console.log(`DASHBOARD_BYTES ${dashboardBytes}`);
		expect(dashboardBytes).toBeLessThan(250_000);

		await page.setViewportSize({ width: 375, height: 812 });
		await page.goto(`/p/${slug}`);
		await expect(page.locator('[data-report="users-version"]')).toHaveCount(1);
		await expect(page.locator('.chart-dom')).toHaveCount(5);
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375);
		const smallTargets = await page.locator('a, button, input, select').evaluateAll((elements) => elements.flatMap((element) => {
			const rect = element.getBoundingClientRect();
			return rect.width > 0 && rect.height > 0 && (rect.width < 32 || rect.height < 32)
				? [{ name: element.getAttribute('aria-label') ?? element.textContent?.trim(), width: rect.width, height: rect.height }]
				: [];
		}));
		console.log(`SMALL_TOUCH_TARGETS ${JSON.stringify(smallTargets)}`);
		expect(smallTargets).toEqual([]);
		const chart = page.locator('.chart-dom').first();
		await chart.scrollIntoViewIfNeeded();
		const box = await chart.boundingBox();
		if (!box) throw new Error('Dashboard chart has no bounding box.');
		const scrollBefore = await page.evaluate(() => window.scrollY);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.wheel(0, 420);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);

		const logoStarted = performance.now();
		await page.locator('.main-header .brand').click();
		await page.waitForURL('/');
		const logoNavigationMs = Math.round((performance.now() - logoStarted) * 100) / 100;
		console.log(`LOGO_NAVIGATION_MS ${logoNavigationMs}`);
		expect(logoNavigationMs).toBeLessThan(1_000);

		await testInfo.attach('public-performance.json', {
			body: JSON.stringify({ observations: observationCount.count, dashboardBytes, logoNavigationMs, samplesMs: measurements }),
			contentType: 'application/json'
		});
	} finally {
		sqlite.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
		sqlite.close();
	}
});
