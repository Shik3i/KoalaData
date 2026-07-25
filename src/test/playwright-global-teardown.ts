import { rmSync } from 'node:fs';

export default function teardown() {
	const testRoot = process.env.KOALADATA_PLAYWRIGHT_ROOT;
	// Windows cannot delete the SQLite files until Playwright stops webServer.
	// Stale directories are pruned at the beginning of the next run.
	if (testRoot && process.platform !== 'win32') {
		rmSync(testRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
	}
}
