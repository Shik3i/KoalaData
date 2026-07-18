import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from './auth';
import { initDb } from './db/setup';

describe('Auth Helpers', () => {
	beforeAll(async () => {
		await initDb();
	});

	it('should hash password using Argon2id', async () => {
		const password = 'mySecretPassword123';
		const hash = await hashPassword(password);

		expect(hash).toContain('$argon2id$');
		expect(hash.split('$').length).toBeGreaterThanOrEqual(6);
	});

	it('should verify correct password', async () => {
		const password = 'mySecretPassword123';
		const hash = await hashPassword(password);
		const match = await verifyPassword(password, hash);

		expect(match).toBe(true);
	});

	it('should reject incorrect password', async () => {
		const password = 'mySecretPassword123';
		const hash = await hashPassword(password);
		const match = await verifyPassword('wrongPassword', hash);

		expect(match).toBe(false);
	});

	it('should generate secure opaque token', () => {
		const token = generateSessionToken();
		expect(token).toHaveLength(64); // 32 bytes in hex
	});

	it('should hash session token with sha256', () => {
		const token = 'abcdef123456';
		const hashed = hashSessionToken(token);
		expect(hashed).toHaveLength(64); // sha256 hex output is 64 chars
	});
});
