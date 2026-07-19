import Database from 'better-sqlite3';

const databasePath = process.argv[2];
if (!databasePath) {
	console.error('Usage: node scripts/verify-backup.mjs <database-path>');
	process.exit(1);
}

const database = new Database(databasePath, { readonly: true, fileMustExist: true });
try {
	const integrity = database.pragma('integrity_check', { simple: true });
	const { count } = database.prepare("SELECT count(1) AS count FROM sqlite_master WHERE type = 'table'").get();
	console.log(JSON.stringify({ integrity, tables: count }));
	if (integrity !== 'ok' || count === 0) process.exitCode = 1;
} finally {
	database.close();
}
