import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default async function setup() {
	const testRoot = mkdtempSync(join(tmpdir(), 'koaladata-vitest-'));
	process.env.DATABASE_PATH = join(testRoot, 'test.db');
	process.env.DATA_DIRECTORY = join(testRoot, 'data');
	process.env.DISABLE_RATE_LIMIT = 'true';
	process.env.NODE_ENV = 'test';
	const { runMigrations } = await import('../lib/server/db/migrate');
	runMigrations();

	return () => rmSync(testRoot, { recursive: true, force: true });
}
