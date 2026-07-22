import { describe, expect, it } from 'vitest';
import { buildHomepageSchemas, buildProjectSchemas, homepageFaqItems, serializeJsonLd } from './seo';

describe('SEO structured data', () => {
	it('keeps FAQ schema answers aligned with visible homepage answers', () => {
		const schemas = buildHomepageSchemas('https://data.koalastuff.net', '1.4.0');
		const faq = schemas.find((schema) => schema['@type'] === 'FAQPage');
		expect(faq).toBeDefined();
		expect(faq?.mainEntity).toEqual(homepageFaqItems.map((item) => ({
			'@type': 'Question',
			name: item.question,
			acceptedAnswer: { '@type': 'Answer', text: item.answer }
		})));
		expect(schemas.find((schema) => schema['@type'] === 'SoftwareApplication')).toMatchObject({
			softwareVersion: '1.4.0',
			operatingSystem: 'Web'
		});
	});

	it('describes public project metrics without duplicating dimensions', () => {
		const [dataset] = buildProjectSchemas('https://data.koalastuff.net', {
			name: 'Example Extension',
			slug: 'example-extension',
			shortDescription: 'Example aggregate metrics.',
			category: 'productivity',
			updatedAt: 1_700_000_000,
			storeUrl: 'https://chromewebstore.google.com/detail/example/abcdefghijklmnopqrstuvwxyzabcdef',
			websiteUrl: null,
			repositoryUrl: 'https://github.com/example/extension'
		}, ['Installs', 'Installs', 'Weekly Users']);
		expect(dataset).toMatchObject({
			'@type': 'Dataset',
			url: 'https://data.koalastuff.net/p/example-extension',
			variableMeasured: [
				{ '@type': 'PropertyValue', name: 'Installs' },
				{ '@type': 'PropertyValue', name: 'Weekly Users' }
			]
		});
	});

	it('escapes markup-significant characters in JSON-LD', () => {
		const serialized = serializeJsonLd({ value: '</script><script>alert(1)</script>' });
		expect(serialized).not.toContain('<');
		expect(JSON.parse(serialized)).toEqual({ value: '</script><script>alert(1)</script>' });
	});
});
