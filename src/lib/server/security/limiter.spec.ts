import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { rateLimitRecords } from '../db/schema';
import { checkRateLimit } from './limiter';

describe('database-backed rate limiter', () => {
	beforeEach(async () => {
		await db.delete(rateLimitRecords);
	});

	it('atomically consumes the configured token capacity', async () => {
		const key = `test:${crypto.randomUUID()}`;
		const results = await Promise.all(
			Array.from({ length: 8 }, () => checkRateLimit(key, 5, 0))
		);

		expect(results.filter(Boolean)).toHaveLength(5);
		expect(results.filter((allowed) => !allowed)).toHaveLength(3);
	});
});
