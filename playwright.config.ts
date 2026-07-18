import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { 
		command: 'npm run build && npm run preview', 
		port: 4173,
		env: {
			DISABLE_RATE_LIMIT: 'true',
			NODE_ENV: 'test'
		}
	},
	testMatch: '**/*.e2e.{ts,js}'
});
