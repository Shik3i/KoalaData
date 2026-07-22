import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const escapeXml = (value: string) => value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!);

export const GET: RequestHandler = async ({ url }) => {
	const publicProjects = await db.select({ slug: projects.slug, updatedAt: projects.updatedAt })
		.from(projects)
		.where(and(eq(projects.visibility, 'public'), eq(projects.moderationStatus, 'active'), isNull(projects.deletedAt)));
	const staticPaths = ['/', '/discover', '/leaderboards', '/security', '/privacy', '/imprint', '/terms'];
	const entries = [
		...staticPaths.map((path) => ({ loc: new URL(path, url.origin).href, lastmod: null })),
		...publicProjects.map((project) => ({
			loc: new URL(`/p/${project.slug}`, url.origin).href,
			lastmod: new Date(project.updatedAt * 1000).toISOString().slice(0, 10)
		}))
	];
	const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map((entry) => `  <url><loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>`;
	return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
};
