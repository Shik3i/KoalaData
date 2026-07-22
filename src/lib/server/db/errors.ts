export function isSqliteUniqueConstraint(error: unknown): boolean {
	if (!error || typeof error !== 'object' || !('code' in error)) return false;
	const code = String(error.code);
	return code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT_PRIMARYKEY';
}
