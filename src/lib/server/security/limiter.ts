import { client } from '../db';

const consumeToken = client.transaction((key: string, maxTokens: number, refillRatePerSec: number) => {
	const now = Date.now() / 1000;
	const record = client
		.prepare('SELECT tokens, last_updated AS lastUpdated FROM rate_limit_records WHERE key = ?')
		.get(key) as { tokens: number; lastUpdated: number } | undefined;
	const availableTokens = record
		? Math.min(maxTokens, record.tokens + Math.max(0, now - record.lastUpdated) * refillRatePerSec)
		: maxTokens;

	if (availableTokens < 1) {
		client
			.prepare('UPDATE rate_limit_records SET tokens = ?, last_updated = ? WHERE key = ?')
			.run(availableTokens, now, key);
		return false;
	}

	client
		.prepare(`
			INSERT INTO rate_limit_records (key, tokens, last_updated)
			VALUES (?, ?, ?)
			ON CONFLICT(key) DO UPDATE SET tokens = excluded.tokens, last_updated = excluded.last_updated
		`)
		.run(key, availableTokens - 1, now);
	return true;
});

/**
 * Check if a request exceeds limits using a database-backed token bucket.
 * The immediate SQLite transaction keeps consumption atomic across processes.
 * Consumes 1 token per call. Returns true if allowed, false if rate-limited.
 */
export async function checkRateLimit(
	key: string,
	maxTokens: number,
	refillRatePerSec: number
): Promise<boolean> {
	try {
		return consumeToken.immediate(key, maxTokens, refillRatePerSec);
	} catch (e) {
		console.error('[Rate Limit] Error checking rate limit:', e);
		return false;
	}
}
