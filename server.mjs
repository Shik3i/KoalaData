import http from 'node:http';
import { handler } from './build/handler.js';

const host = process.env.HOST || '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);

const revalidatedAssets = new Set([
	'/android-chrome-192x192.png',
	'/android-chrome-512x512.png',
	'/apple-touch-icon.png',
	'/favicon.ico',
	'/favicon-16x16.png',
	'/favicon-32x32.png',
	'/og-fallback.png',
	'/og-koaladata.png',
	'/llms-full.txt',
	'/llms.txt',
	'/robots.txt',
	'/site.webmanifest'
]);

function staticContentType(pathname) {
	if (pathname.endsWith('.png')) return 'image/png';
	if (pathname.endsWith('.ico')) return 'image/x-icon';
	if (pathname.endsWith('.avif')) return 'image/avif';
	if (pathname.endsWith('.webp')) return 'image/webp';
	if (pathname === '/site.webmanifest') return 'application/manifest+json; charset=utf-8';
	if (pathname.endsWith('.txt')) return 'text/plain; charset=utf-8';
	return null;
}

const server = http.createServer((request, response) => {
	const pathname = new URL(request.url || '/', 'http://localhost').pathname;

	if (pathname.startsWith('/brand/') || revalidatedAssets.has(pathname)) {
		response.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
		const contentType = staticContentType(pathname);
		if (contentType) response.setHeader('Content-Type', contentType);
	}

	handler(request, response);
});

server.listen(port, host, () => {
	console.log(`Listening on http://${host}:${port}`);
});

function shutdown() {
	server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
