import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import db from './index';
import path from 'path';

export function runMigrations() {
	try {
		console.log('[Database] Running database migrations...');
		const migrationsFolder = path.resolve('migrations');
		migrate(db, { migrationsFolder });
		console.log('[Database] Database migrations completed successfully.');
	} catch (error) {
		console.error('[Database] Database migrations failed:', error);
		process.exit(1);
	}
}
