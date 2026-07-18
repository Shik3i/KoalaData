import { runMigrations } from './migrate';
import { runSeeding } from './seed';

let initialized = false;

export async function initDb() {
	if (initialized) return;
	runMigrations();
	await runSeeding();
	initialized = true;
}
