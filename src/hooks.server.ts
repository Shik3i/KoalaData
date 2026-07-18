import { initDb } from '$lib/server/db/setup';
import { validateSession, invalidateSession } from '$lib/server/auth';
import { checkRateLimit } from '$lib/server/security/limiter';
import { redirect, type Handle } from '@sveltejs/kit';
import crypto from 'crypto';

// Initialize the database on server startup
export async function init() {
	await initDb();
}

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Resolve client IP (fall back to 'local' if getClientAddress() throws)
	let clientIp = '127.0.0.1';
	try {
		clientIp = event.getClientAddress() || '127.0.0.1';
	} catch (e) {
		// Ignore
	}

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
	}

	if (pathname.startsWith('/admin')) {
		if (!event.locals.user || event.locals.user.role !== 'admin') {
			throw redirect(302, '/login?error=admin_required');
		}
		if (event.locals.user.status === 'pending') {
			throw redirect(302, '/login?error=pending_approval');
		}
	}

	// 4. CSP Nonce Generation and Injection
	const nonce = crypto.randomBytes(16).toString('base64');
	
	const resolveOptions: any = {
		transformPageChunk: ({ html }) => html.replace(/%sveltekit\.nonce%/g, nonce)
	};
	if (!disableRateLimit) {
		resolveOptions.nonce = nonce;
	}

	const response = await resolve(event, resolveOptions);

	// Apply security headers
	const scriptSrc = disableRateLimit 
		? `script-src 'self' 'unsafe-inline';` 
		: `script-src 'self' 'nonce-${nonce}';`;

	response.headers.set(
		'Content-Security-Policy',
		`default-src 'self'; ${scriptSrc} style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';`
	);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

	return response;
};
