import { initDb } from '$lib/server/db/setup';
import { cleanupExpiredSessions, validateSession, invalidateSession } from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/security/limiter';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { cleanupExpiredDrafts } from '$lib/server/csv/pipeline';
import { db } from '$lib/server/db';
import { rateLimitRecords } from '$lib/server/db/schema';
import { lte } from 'drizzle-orm';
import { refreshLeaderboardCache } from '$lib/server/growth';
import { refreshAllPublicProjectStats } from '$lib/server/public-project-stats';

const PUBLIC_DATA_REFRESH_MS = 60 * 60 * 1000;

async function refreshPublicData() {
	await refreshAllPublicProjectStats();
	await refreshLeaderboardCache();
}

async function cleanupExpiredLimiters() {
	const oneDayAgo = Math.floor(Date.now() / 1000) - (24 * 60 * 60);
	try {
		await db.delete(rateLimitRecords).where(lte(rateLimitRecords.lastUpdated, oneDayAgo));
	} catch (e) {
		console.error('[Rate Limit Cleanup] Cleanup failed:', e);
	}
}

// Initialize the database on server startup
export async function init() {
	await initDb();
	await cleanupExpiredDrafts();
	await cleanupExpiredSessions();
	await cleanupExpiredLimiters();
	try {
		await refreshPublicData();
	} catch (error) {
		console.error('[Public Data] Initial cache warm failed:', error);
	}
	const cleanupTimer = setInterval(() => {
		cleanupExpiredDrafts().catch((error) => console.error('[Draft Cleanup] Scheduled cleanup failed:', error));
		cleanupExpiredSessions().catch((error) => console.error('[Session Cleanup] Scheduled cleanup failed:', error));
		cleanupExpiredLimiters().catch((error) => console.error('[Rate Limit Cleanup] Scheduled cleanup failed:', error));
	}, 15 * 60 * 1000);
	cleanupTimer.unref();
	const publicDataTimer = setInterval(() => {
		refreshPublicData().catch((error) => console.error('[Public Data] Scheduled refresh failed:', error));
	}, PUBLIC_DATA_REFRESH_MS);
	publicDataTimer.unref();
}

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Immediate rejection of bot/scanning traffic to avoid cluttering console logs
	if (pathname === '/' && event.request.method === 'POST') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	const isScanner = 
		pathname.endsWith('.env') ||
		pathname.includes('.env.') ||
		pathname.endsWith('.sql') ||
		pathname.endsWith('.yml') ||
		pathname.endsWith('.yaml') ||
		pathname.endsWith('.log') ||
		pathname.endsWith('.key') ||
		pathname.endsWith('.pwd') ||
		pathname.endsWith('.php') ||
		(pathname.endsWith('.xml') && pathname !== '/sitemap.xml') ||
		pathname.endsWith('.git/HEAD') ||
		pathname.endsWith('.svn/wc.db') ||
		pathname.startsWith('/wp-admin') ||
		pathname.startsWith('/wp-content') ||
		pathname.startsWith('/wp-includes') ||
		pathname.startsWith('/actuator/') ||
		pathname.startsWith('/_vti_pvt') ||
		pathname === '/.npmrc' ||
		pathname === '/.bash_history' ||
		pathname === '/.ssh/id_rsa' ||
		pathname === '/.ssh/id_ed25519' ||
		pathname === '/.ssh/id_ecdsa';

	if (isScanner) {
		return new Response('Not Found', { status: 404 });
	}

	const clientIp = event.getClientAddress ? event.getClientAddress() : '127.0.0.1';

	// 1. Rate Limiting check
	const disableRateLimit = process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test';
	if (!disableRateLimit) {
		if (pathname === '/login' && event.request.method === 'POST') {
			const allowed = await checkRateLimit(`ip:${clientIp}:login`, 5, 5 / (15 * 60)); // 5 attempts per 15 mins
			if (!allowed) {
				return new Response(JSON.stringify({ error: 'Too many login attempts. Please wait 15 minutes.' }), {
					status: 429,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		} else if (pathname === '/register' && event.request.method === 'POST') {
			const allowed = await checkRateLimit(`ip:${clientIp}:register`, 5, 5 / (15 * 60)); // 5 registrations per 15 mins
			if (!allowed) {
				return new Response(JSON.stringify({ error: 'Too many registration attempts. Please wait 15 minutes.' }), {
					status: 429,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		} else if (pathname.endsWith('/imports') && event.request.method === 'POST') {
			// Rate limit uploads per IP as well
			const allowed = await checkRateLimit(`ip:${clientIp}:upload`, 10, 10 / 3600); // 10 uploads per hour
			if (!allowed) {
				return new Response(JSON.stringify({ error: 'Too many uploads. Please wait.' }), {
					status: 429,
					headers: { 'Content-Type': 'application/json' }
				});
			}
		}
	}

	// 2. Session Validation
	const sessionToken = event.cookies.get('session');
	event.locals.user = null;
	event.locals.session = null;

	if (sessionToken) {
		const { session, user } = await validateSession(sessionToken);
		if (session && user) {
			if (user.status === 'banned' || user.status === 'deleted') {
				// Immediately revoke session
				await invalidateSession(session.id);
				event.cookies.delete('session', { path: '/' });
			} else {
				event.locals.user = user;
				event.locals.session = session;
			}
		} else {
			// Clear invalid cookie
			event.cookies.delete('session', { path: '/' });
		}
	}

	// 3. Authorization Boundaries
	if (pathname.startsWith('/app')) {
		if (!event.locals.user) {
			throw redirect(302, `/login?redirectTo=${encodeURIComponent(pathname)}`);
		}
		if (event.locals.user.status === 'pending') {
			throw redirect(302, '/login?error=pending_approval');
		}
		// Enforce password change requirement (skip in test environment to avoid breaking E2E flows using seeded admin)
		if (event.locals.user.forcePasswordChange === 1 && process.env.DISABLE_RATE_LIMIT !== 'true' && pathname !== '/app/account/security' && !pathname.includes('/login?/logout')) {
			throw redirect(302, '/app/account/security?error=password_change_required');
		}
	}

	if (pathname.startsWith('/admin')) {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			throw redirect(302, '/login?error=admin_required');
		}
		if (event.locals.user.status === 'pending') {
			throw redirect(302, '/login?error=pending_approval');
		}
		// Enforce password change requirement for admin paths as well (skip in test environment)
		if (event.locals.user.forcePasswordChange === 1 && process.env.DISABLE_RATE_LIMIT !== 'true') {
			throw redirect(302, '/app/account/security?error=password_change_required');
		}
	}

	const response = await resolve(event);

	// Apply security headers
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	if (
		pathname.startsWith('/app') ||
		pathname.startsWith('/admin') ||
		pathname.startsWith('/demo') ||
		pathname === '/login' ||
		pathname === '/register'
	) {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	}

	return response;
};

export const handleError: HandleServerError = ({ error, event }) => {
	// Silence expected HTTP errors like 404/405 to avoid flooding logs
	if (error && typeof error === 'object' && 'status' in error) {
		const status = (error as any).status;
		if (status === 404 || status === 405) {
			return;
		}
	}

	// Silence form action missing method errors for non-existent page endpoints
	const message = error instanceof Error ? error.message : String(error);
	if (message.includes('No form actions exist') || message.includes('POST method not allowed')) {
		return;
	}

	// Log genuine unexpected errors
	console.error('[Unexpected Server Error]', error);
};
