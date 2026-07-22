import crypto from 'crypto';
import db from './db';
import { auditLogs } from './db/schema';
import { minimizeIpAddress, minimizeUserAgent } from './privacy';

/**
 * Log a security, moderation, or administrative action to the audit logs database table.
 */
export async function logAuditEvent(
	actorId: string | null,
	actorUsername: string,
	action: string,
	targetType: string,
	targetId: string,
	metadata?: Record<string, any> | null,
	ipAddress?: string | null,
	userAgent?: string | null
) {
	try {
		const cleanMetadata = metadata ? { ...metadata } : {};
		
		// Ensure sensitive secrets are never logged in metadata
		const blacklistedSecrets = ['password', 'token', 'secret', 'cookie', 'session'];
		for (const key of Object.keys(cleanMetadata)) {
			if (blacklistedSecrets.some(secret => key.toLowerCase().includes(secret))) {
				delete cleanMetadata[key];
			}
		}

		await db.insert(auditLogs).values({
			id: crypto.randomUUID(),
			actorId,
			actorUsername,
			action,
			targetType,
			targetId,
			timestamp: Math.floor(Date.now() / 1000),
			metadata: Object.keys(cleanMetadata).length > 0 ? JSON.stringify(cleanMetadata) : null,
			ipAddress: minimizeIpAddress(ipAddress),
			userAgent: minimizeUserAgent(userAgent)
		});
	} catch (e) {
		console.error('[Audit Log] Failed to write audit log event:', e);
	}
}
