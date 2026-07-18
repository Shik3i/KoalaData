import { db } from '$lib/server/db';
import { projects, dataSources, metricDefinitions } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { getEffectiveObservations } from '$lib/server/observations';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const slug = params.slug;

	const projectRecord = await db
		.select()
		.from(projects)
		.where(and(eq(projects.slug, slug), isNull(projects.deletedAt)))
		.limit(1);

	if (projectRecord.length === 0) {
		throw error(404, 'Project not found.');
	}

	const project = projectRecord[0];

	let activeUsers = 'N/A';
	let installs = 'N/A';

	try {
		const sources = await db.select().from(dataSources).where(eq(dataSources.projectId, project.id));
		for (const src of sources) {
			const definitions = await db
				.select()
				.from(metricDefinitions)
				.where(eq(metricDefinitions.sourceId, src.id));

			for (const def of definitions) {
				if (def.metricType === 'active_users') {
					const obs = await getEffectiveObservations(src.id, def.id);
					if (obs.length > 0) {
						activeUsers = obs[obs.length - 1].value.toLocaleString();
					}
				}
				if (def.metricType === 'installs') {
					const obs = await getEffectiveObservations(src.id, def.id);
					if (obs.length > 0) {
						installs = obs[obs.length - 1].value.toLocaleString();
					}
				}
			}
		}
	} catch (e) {
		// Ignore
	}

	const cleanCategory = (project.category || 'other').toUpperCase();
	const cleanDesc = project.shortDescription.length > 70 
		? project.shortDescription.substring(0, 70) + '...' 
		: project.shortDescription;

	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
			<defs>
				<linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
					<stop offset="0%" style="stop-color:#f4f7f4;stop-opacity:1" />
					<stop offset="100%" style="stop-color:#e4e8e4;stop-opacity:1" />
				</linearGradient>
			</defs>
			<rect width="100%" height="100%" fill="url(#grad)" />
			<circle cx="1050" cy="150" r="250" fill="#556b2f" opacity="0.05" />
			<circle cx="150" cy="500" r="180" fill="#8fbc8f" opacity="0.08" />

			<text x="80" y="110" font-family="system-ui, sans-serif" font-size="38" font-weight="bold" fill="#556b2f">🐨 KoalaData</text>

			<rect x="80" y="170" width="180" height="36" rx="8" fill="#e2ede2" />
			<text x="170" y="193" font-family="system-ui, sans-serif" font-size="15" font-weight="bold" fill="#2e3d30" text-anchor="middle">${cleanCategory}</text>

			<text x="80" y="270" font-family="system-ui, sans-serif" font-size="72" font-weight="800" fill="#2e3d30">${project.name}</text>

			<text x="80" y="340" font-family="system-ui, sans-serif" font-size="28" fill="#566658">${cleanDesc}</text>

			<g transform="translate(80, 420)">
				<rect x="0" y="0" width="280" height="110" rx="12" fill="#ffffff" stroke="#d2d8d2" stroke-width="1.5" />
				<text x="20" y="35" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#64748b">WEEKLY ACTIVE USERS</text>
				<text x="20" y="85" font-family="system-ui, sans-serif" font-size="36" font-weight="bold" fill="#556b2f">${activeUsers}</text>

				<rect x="310" y="0" width="280" height="110" rx="12" fill="#ffffff" stroke="#d2d8d2" stroke-width="1.5" />
				<text x="330" y="35" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#64748b">DAILY INSTALLS</text>
				<text x="330" y="85" font-family="system-ui, sans-serif" font-size="36" font-weight="bold" fill="#2e3d30">${installs}</text>
			</g>

			<text x="80" y="580" font-family="system-ui, sans-serif" font-size="16" fill="#8f9c90">Self-Hosted Extension Metrics Platform</text>
		</svg>
	`.trim();

	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=600'
		}
	});
};
