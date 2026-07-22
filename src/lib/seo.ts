export const SITE_NAME = 'KoalaData';
export const SITE_DESCRIPTION = 'Import aggregate Chrome Web Store CSV reports, verify mappings, and publish shareable extension analytics dashboards without adding user tracking.';
export const SOCIAL_IMAGE_PATH = '/og-koaladata.png';

export const homepageFaqItems = [
	{
		question: 'Does KoalaData track extension users?',
		answer: 'No. It imports aggregate publisher CSV reports and does not require code or an SDK inside your extension.'
	},
	{
		question: 'Which CSV report languages are detected?',
		answer: 'KoalaData recognizes common Chrome Web Store headers in English, German, French, Spanish, Portuguese, Italian, Dutch, Polish and Turkish. You can map an unrecognized report manually.'
	},
	{
		question: 'What does “verified” mean?',
		answer: 'An administrator reviewed the listing and supporting evidence. Verification confirms that review only; it is not an endorsement or a guarantee.'
	},
	{
		question: 'Can I prepare a dashboard privately?',
		answer: 'Yes. Start unlisted or private, review the complete dashboard, and request a public directory listing only when ready.'
	},
	{
		question: 'Are publisher links dofollow?',
		answer: 'Yes. Approved public profiles use standard dofollow links to the official store, website, and source repository. Search engines decide how those links affect rankings.'
	},
	{
		question: 'Are uploaded CSV files public?',
		answer: 'No. Raw files remain private to authorized project members. Public dashboards show only the reviewed aggregate metrics derived from confirmed imports.'
	}
] as const;

export function serializeJsonLd(value: Record<string, unknown>): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function buildHomepageSchemas(origin: string, version: string): Record<string, unknown>[] {
	const root = `${origin}/`;
	const software: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		'@id': `${root}#software`,
		name: SITE_NAME,
		url: root,
		description: SITE_DESCRIPTION,
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Web',
		inLanguage: 'en',
		isAccessibleForFree: true,
		license: 'https://github.com/Shik3i/KoalaData/blob/master/LICENSE',
		sameAs: ['https://github.com/Shik3i/KoalaData'],
		featureList: [
			'Chrome Web Store CSV import previews',
			'Public, unlisted, and private extension dashboards',
			'Installed-user, acquisition, audience, retention, and rating analytics',
			'Self-hosted deployment without extension telemetry'
		]
	};
	if (/^\d+\.\d+\.\d+$/.test(version)) software.softwareVersion = version;

	return [
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			'@id': `${root}#website`,
			name: SITE_NAME,
			url: root,
			description: SITE_DESCRIPTION,
			inLanguage: 'en',
			potentialAction: {
				'@type': 'SearchAction',
				target: `${origin}/discover?q={search_term_string}`,
				'query-input': 'required name=search_term_string'
			}
		},
		software,
		{
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: homepageFaqItems.map((item) => ({
				'@type': 'Question',
				name: item.question,
				acceptedAnswer: { '@type': 'Answer', text: item.answer }
			}))
		}
	];
}

export interface ProjectSeoInput {
	name: string;
	slug: string;
	shortDescription: string;
	category: string;
	updatedAt: number;
	storeUrl?: string | null;
	websiteUrl?: string | null;
	repositoryUrl?: string | null;
}

export function buildProjectSchemas(origin: string, project: ProjectSeoInput, metricNames: string[]): Record<string, unknown>[] {
	const url = `${origin}/p/${project.slug}`;
	const sameAs = [...new Set([project.storeUrl, project.websiteUrl, project.repositoryUrl].filter((value): value is string => Boolean(value)))];
	return [{
		'@context': 'https://schema.org',
		'@type': 'Dataset',
		name: `${project.name} Chrome Web Store analytics`,
		description: project.shortDescription,
		url,
		inLanguage: 'en',
		isAccessibleForFree: true,
		dateModified: new Date(project.updatedAt * 1000).toISOString(),
		keywords: ['browser extension analytics', 'Chrome Web Store', project.category],
		measurementTechnique: 'Aggregate Chrome Web Store CSV exports reviewed by the publisher',
		includedInDataCatalog: {
			'@type': 'DataCatalog',
			name: 'KoalaData public extension dashboards',
			url: `${origin}/discover`
		},
		...(sameAs.length ? { sameAs } : {}),
		...(metricNames.length ? {
			variableMeasured: [...new Set(metricNames)].slice(0, 50).map((name) => ({ '@type': 'PropertyValue', name }))
		} : {})
	}];
}
