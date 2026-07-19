import { defineConfig } from '@playwright/test';

export default defineConfig({
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173'
	},
	webServer: process.env.PLAYWRIGHT_EXTERNAL_SERVER ? undefined : {
		command: 'npm run build && node build',
		url: 'http://127.0.0.1:4173/api/health',
		timeout: 180_000,
		env: {
			DISABLE_RATE_LIMIT: 'true',
			NODE_ENV: 'test',
			PORT: '4173',
			ORIGIN: 'http://127.0.0.1:4173'
		}
	},
	testMatch: '**/*.e2e.{ts,js}'
});
