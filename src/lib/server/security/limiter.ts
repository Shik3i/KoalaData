import db from '../db';
import { rateLimitRecords } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if a request exceeds rate limits using a database-backed Token Bucket algorithm.
 * consumes 1 token per call. Returns true if allowed, false if rate-limited.
 */
export async function checkRateLimit(
	key: string,
	maxTokens: number,
	refillRatePerSec: number
): Promise<boolean> {
	try {
		const now = Math.floor(Date.now() / 1000);
		const records = await db
			.select()
			.from(rateLimitRecords)
			.where(eq(rateLimitRecords.key, key))
			.limit(1);

		let tokens = maxTokens;

		if (records.length > 0) {
			const record = records[0];
			const elapsed = now - record.lastUpdated;
			// Refill tokens based on time elapsed
			tokens = Math.min(maxTokens, record.tokens + elapsed * refillRatePerSec);

			if (tokens < 1) {
				return false;
			}

			// Consume 1 token and update last updated time
			await db
				.update(rateLimitRecords)
				.set({
					tokens: tokens - 1,
					lastUpdated: now
				})
				.where(eq(rateLimitRecords.key, key));
		} else {
			// First entry, consume 1 token
			await db.insert(rateLimitRecords).values({
				key,
				tokens: maxTokens - 1,
				lastUpdated: now
			});
		}

		return true;
	} catch (e) {
		// Log error but fail open under database errors to prevent complete system lock
		console.error('[Rate Limit] Error checking rate limit:', e);
		return true;
	}
}
