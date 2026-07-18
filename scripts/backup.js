const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || './data/data.db';
const backupDir = process.env.BACKUP_DIRECTORY || './backups';

// Ensure backup folder exists
if (!fs.existsSync(backupDir)) {
	fs.mkdirSync(backupDir, { recursive: true });
}

try {
	const db = new Database(dbPath);
	const timestamp = Math.floor(Date.now() / 1000);
	const backupFilename = `backup-${timestamp}.db`;
	const backupPath = path.join(backupDir, backupFilename);

	console.log(`[Backup] Starting online SQLite backup from ${dbPath} to ${backupPath}...`);
	
	db.backup(backupPath)
		.then(() => {
			console.log('[Backup] Online SQLite backup completed successfully.');
			
			// Retain only the last 7 days of backups
			const files = fs.readdirSync(backupDir);
			const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
			
			for (const file of files) {
				const filePath = path.join(backupDir, file);
				if (fs.existsSync(filePath) && file.endsWith('.db')) {
					const stats = fs.statSync(filePath);
					if (stats.mtimeMs < sevenDaysAgo) {
						fs.unlinkSync(filePath);
						console.log(`[Backup] Pruned old backup file: ${file}`);
					}
				}
			}
			process.exit(0);
		})
		.catch((err) => {
			console.error('[Backup] Backup promise rejected:', err);
			process.exit(1);
		});
} catch (error) {
	console.error('[Backup] Failed to open database or execute backup:', error);
	process.exit(1);
}
