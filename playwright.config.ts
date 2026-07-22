import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const testRoot = mkdtempSync(join(tmpdir(), 'koaladata-playwright-'));
process.env.KOALADATA_PLAYWRIGHT_ROOT = testRoot;

export default defineConfig({
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'
	},
	webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
		command: 'npm run build && node server.mjs',
		url: 'http://127.0.0.1:4173/api/health',
		timeout: 180_000,
		env: {
			DATABASE_PATH: join(testRoot, 'test.db'),
			DATA_DIRECTORY: join(testRoot, 'data'),
			DISABLE_RATE_LIMIT: 'true',
			NODE_ENV: 'test',
			PORT: '4173',
			ORIGIN: 'http://127.0.0.1:4173'
		}
	},
	globalTeardown: './src/test/playwright-global-teardown.ts',
	testMatch: '**/*.e2e.{ts,js}'
});
