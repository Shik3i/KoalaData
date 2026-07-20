/**
 * In-memory Token Bucket rate limiter.
 * Periodically prunes stale entries to prevent memory leaks.
 */

interface BucketEntry {
	tokens: number;
	lastUpdated: number;
}

const buckets = new Map<string, BucketEntry>();

// Prune stale entries every 5 minutes
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
const ENTRY_TTL_MS = 30 * 60 * 1000;

setInterval(() => {
	const now = Math.floor(Date.now() / 1000);
	for (const [key, entry] of buckets) {
		if (now - entry.lastUpdated > ENTRY_TTL_MS / 1000) {
			buckets.delete(key);
		}
	}
}, PRUNE_INTERVAL_MS).unref();

/**
 * Check if a request exceeds rate limits using an in-memory Token Bucket algorithm.
 * Consumes 1 token per call. Returns true if allowed, false if rate-limited.
 */
export async function checkRateLimit(
	key: string,
	maxTokens: number,
	refillRatePerSec: number
): Promise<boolean> {
	try {
		const now = Math.floor(Date.now() / 1000);
		const record = buckets.get(key);

		if (record) {
			const elapsed = now - record.lastUpdated;
			const tokens = Math.min(maxTokens, record.tokens + elapsed * refillRatePerSec);

			if (tokens < 1) {
				return false;
			}

			buckets.set(key, {
				tokens: tokens - 1,
				lastUpdated: now
			});
		} else {
			buckets.set(key, {
				tokens: maxTokens - 1,
				lastUpdated: now
			});
		}

		return true;
	} catch (e) {
		console.error('[Rate Limit] Error checking rate limit:', e);
		return true;
	}
}
