import { defineConfig, devices } from '@playwright/test';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const tempDirectory = tmpdir();
for (const entry of readdirSync(tempDirectory)) {
	if (!entry.startsWith('koaladata-playwright-')) continue;
	const candidate = join(tempDirectory, entry);
	try {
		if (Date.now() - statSync(candidate).mtimeMs > 60 * 60 * 1000) {
			rmSync(candidate, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
		}
	} catch {
		// A running test process may still own the directory.
	}
}

const testRoot = process.env.KOALADATA_PLAYWRIGHT_ROOT || mkdtempSync(join(tempDirectory, 'koaladata-playwright-'));
mkdirSync(testRoot, { recursive: true });
process.env.KOALADATA_PLAYWRIGHT_ROOT = testRoot;
process.env.DATABASE_PATH = join(testRoot, 'test.db');
process.env.DATA_DIRECTORY = join(testRoot, 'data');

export default defineConfig({
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'firefox', use: { ...devices['Desktop Firefox'] } }
	],
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'
	},
	webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
		command: 'npm run build && node server.mjs',
		url: 'http://127.0.0.1:4173/api/health',
		timeout: 180_000,
		env: {
			DATABASE_PATH: process.env.DATABASE_PATH,
			DATA_DIRECTORY: process.env.DATA_DIRECTORY,
			DISABLE_RATE_LIMIT: 'true',
			NODE_ENV: 'test',
			PORT: '4173',
			ORIGIN: 'http://127.0.0.1:4173'
		}
	},
	globalTeardown: './src/test/playwright-global-teardown.ts',
	testMatch: '**/*.e2e.{ts,js}'
});
