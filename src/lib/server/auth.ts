import { argon2id } from 'hash-wasm';
import crypto from 'crypto';
import db from './db';
import { sessions, systemSettings, users } from './db/schema';
import { eq, and, isNull } from 'drizzle-orm';


// Hashing configuration (OWASP recommended defaults for lightweight setups)
const MEMORY_SIZE = 15360; // 15 MB
const ITERATIONS = 2;
const PARALLELISM = 1;
const HASH_LENGTH = 32;
const DEFAULT_SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function getSessionMaxAgeSeconds(): Promise<number> {
	const configured = await db
		.select({ value: systemSettings.value })
		.from(systemSettings)
		.where(eq(systemSettings.key, 'session_max_age'))
		.limit(1);
	const value = Number.parseInt(configured[0]?.value || process.env.SESSION_MAX_AGE || '', 10);
	return Number.isInteger(value) && value >= 300 ? value : DEFAULT_SESSION_MAX_AGE;
}

/**
 * Hash a password using Argon2id with hash-wasm.
 * Returns a standard PHC format string.
 */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.randomBytes(16);
	return await argon2id({
		password,
		salt,
		parallelism: PARALLELISM,
		iterations: ITERATIONS,
		memorySize: MEMORY_SIZE,
		hashLength: HASH_LENGTH,
		outputType: 'encoded'
	});
}

/**
 * Verify a password against a standard Argon2id PHC hash.
 */
export async function verifyPassword(password: string, phcHash: string): Promise<boolean> {
	try {
		const parts = phcHash.split('$');
		if (parts.length < 6 || parts[1] !== 'argon2id') {
			return false;
		}

		// Parse params e.g. "m=15360,t=2,p=1"
		const paramsStr = parts[3];
		const params = paramsStr.split(',');
		const memorySize = parseInt(params.find((x) => x.startsWith('m='))?.split('=')[1] || '15360', 10);
		const iterations = parseInt(params.find((x) => x.startsWith('t='))?.split('=')[1] || '2', 10);
		const parallelism = parseInt(params.find((x) => x.startsWith('p='))?.split('=')[1] || '1', 10);

		// Extract salt and convert from base64
		// Note: hash-wasm encoded format uses standard or unpadded base64. Buffer.from handles both.
		const salt = Buffer.from(parts[4], 'base64');
		const hashBytes = Buffer.from(parts[5], 'base64');

		const testHash = await argon2id({
			password,
			salt,
			parallelism,
			iterations,
			memorySize,
			hashLength: hashBytes.length,
			outputType: 'encoded'
		});

		// Compare using a constant-time comparison to prevent timing side-channel attacks
		return crypto.timingSafeEqual(Buffer.from(phcHash), Buffer.from(testHash));
	} catch (e) {
		return false;
	}
}

/**
 * Generate a cryptographically secure opaque session token (64 hex characters).
 */
export function generateSessionToken(): string {
	return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute the SHA-256 hash of a session token for storage.
 */
export function hashSessionToken(token: string): string {
	return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create a new session in the database.
 */
export async function createSession(
	token: string,
	userId: string,
	ipAddress?: string | null,
	userAgent?: string | null
) {
	const hashedToken = hashSessionToken(token);
	// Persistent lifetime follows the global session setting.
	const expiresAt = Math.floor(Date.now() / 1000) + await getSessionMaxAgeSeconds();
	const now = Math.floor(Date.now() / 1000);

	await db.insert(sessions).values({
		id: hashedToken,
		userId,
		expiresAt,
		createdAt: now,
		lastUsedAt: now,
		ipAddress: ipAddress || null,
		userAgent: userAgent || null
	});

	return {
		id: hashedToken,
		userId,
		expiresAt
	};
}

/**
 * Validate a session token and return the associated user and session metadata.
 * Expired sessions are ignored or removed.
 */
export async function validateSession(token: string) {
	const hashedToken = hashSessionToken(token);
	const now = Math.floor(Date.now() / 1000);

	const result = await db
		.select({
			session: sessions,
			user: users
		})
		.from(sessions)
		.innerJoin(users, eq(sessions.userId, users.id))
		.where(and(eq(sessions.id, hashedToken), isNull(users.deletedAt)))
		.limit(1);

	if (result.length === 0) {
		return { session: null, user: null };
	}

	const { session, user } = result[0];

	if (now >= session.expiresAt) {
		// Session expired, delete it
		await db.delete(sessions).where(eq(sessions.id, hashedToken));
		return { session: null, user: null };
	}

	// Update last used timestamp if older than 1 hour to prevent constant write churn
	if (now - session.lastUsedAt > 3600) {
		await db
			.update(sessions)
			.set({ lastUsedAt: now })
			.where(eq(sessions.id, hashedToken));
		session.lastUsedAt = now;
	}

	return { session, user };
}

/**
 * Invalidate a session by token hash.
 */
export async function invalidateSession(tokenHash: string) {
	await db.delete(sessions).where(eq(sessions.id, tokenHash));
}

/**
 * Invalidate all sessions belonging to a specific user.
 */
export async function invalidateUserSessions(userId: string) {
	await db.delete(sessions).where(eq(sessions.userId, userId));
}
