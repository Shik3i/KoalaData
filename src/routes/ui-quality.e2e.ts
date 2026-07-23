import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicRoutes = ['/', '/discover', '/leaderboards', '/login', '/register', '/privacy', '/imprint', '/terms', '/security'];

test('homepage presents a balanced FAQ and a compact versioned footer', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.faq-grid details')).toHaveCount(6);
	await expect(page.getByText('Are publisher links dofollow?')).toBeVisible();
	await expect(page.locator('.main-footer .footer-links a')).toHaveCount(5);
	await expect(page.getByRole('link', { name: 'Support KoalaData' })).toHaveAttribute(
		'href',
		'https://support.koalastuff.net'
	);
	const releaseLink = page.locator('.main-footer a', { hasText: /^GitHub v\d+\.\d+\.\d+$/ });
	await expect(releaseLink).toHaveAttribute('href', /\/releases\/tag\/v\d+\.\d+\.\d+$/);
	await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og-koaladata\.png$/);
	await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
	await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
	await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
	const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
	const schemaTypes = schemas.map((schema) => JSON.parse(schema)['@type']);
	expect(schemaTypes).toEqual(expect.arrayContaining(['WebSite', 'SoftwareApplication', 'FAQPage']));
});

test('machine-readable discovery files expose canonical public sources', async ({ request }) => {
	const [robots, sitemap, llms, llmsFull, manifest, preview, favicon, favicon16, favicon32, appleIcon, android192, android512] = await Promise.all([
		request.get('/robots.txt'),
		request.get('/sitemap.xml'),
		request.get('/llms.txt'),
		request.get('/llms-full.txt'),
		request.get('/site.webmanifest'),
		request.get('/og-koaladata.png'),
		request.get('/favicon.ico'),
		request.get('/favicon-16x16.png'),
		request.get('/favicon-32x32.png'),
		request.get('/apple-touch-icon.png'),
		request.get('/android-chrome-192x192.png'),
		request.get('/android-chrome-512x512.png')
	]);
	expect(robots.ok()).toBe(true);
	expect(await robots.text()).toContain('Sitemap: https://data.koalastuff.net/sitemap.xml');
	expect(sitemap.ok()).toBe(true);
	expect(sitemap.headers()['content-type']).toContain('application/xml');
	expect(await sitemap.text()).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
	expect(llms.ok()).toBe(true);
	expect(await llms.text()).toContain('Detailed product and data semantics: https://data.koalastuff.net/llms-full.txt');
	expect(llmsFull.ok()).toBe(true);
	expect(manifest.ok()).toBe(true);
	expect(manifest.headers()['content-type']).toContain('application/manifest+json');
	expect((await manifest.json()).name).toBe('KoalaData');
	expect(preview.ok()).toBe(true);
	expect(preview.headers()['content-type']).toBe('image/png');
	for (const asset of [favicon, favicon16, favicon32, appleIcon, android192, android512]) {
		expect(asset.ok()).toBe(true);
		expect(asset.headers()['content-type']).toMatch(/^image\//);
		expect(asset.headers()['cache-control']).toContain('max-age=86400');
		expect(asset.headers()['cache-control']).not.toContain('immutable');
	}
});

test('English legal pages disclose account data and seven-day access logs', async ({ page }) => {
	await page.goto('/privacy');
	await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
	await expect(page.getByText(/access logs for seven days/i)).toBeVisible();
	await expect(page.getByText(/Account and session records are personal data/i)).toBeVisible();
	await expect(page.getByText(/Datenschutzerklärung|personenbezogene Daten/i)).toHaveCount(0);

	await page.goto('/terms');
	await expect(page.getByRole('heading', { name: 'Terms of Use' })).toBeVisible();
	await expect(page.getByText(/Nutzungsbedingungen/i)).toHaveCount(0);

	await page.goto('/imprint');
	await expect(page.getByRole('link', { name: 'koaladata@koalastuff.net' })).toHaveAttribute(
		'href',
		'mailto:koaladata@koalastuff.net'
	);
});

for (const width of [320, 375, 390, 768, 1024, 1440, 1920]) {
	test(`public layout has no viewport overflow at ${width}px`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		for (const route of publicRoutes) {
			await page.goto(route);
			const viewport = await page.evaluate(() => ({
				clientWidth: document.documentElement.clientWidth,
				scrollWidth: document.documentElement.scrollWidth,
				mainCount: document.querySelectorAll('main').length
			}));
			expect(viewport.scrollWidth, `${route} overflows at ${width}px`).toBe(viewport.clientWidth);
			expect(viewport.mainCount, `${route} must expose one main landmark`).toBe(1);
		}
	});
}

for (const theme of ['light', 'dark']) {
	test(`public pages pass automated accessibility checks in ${theme} mode`, async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 900 });
		await page.addInitScript((selectedTheme) => localStorage.setItem('theme', selectedTheme), theme);

		for (const route of publicRoutes) {
			await page.goto(route);
			if (theme === 'dark') {
				await expect(page.locator('html')).toHaveClass(/dark/);
			} else {
				await expect(page.locator('html')).not.toHaveClass(/dark/);
			}
			const results = await new AxeBuilder({ page }).analyze();
			expect(results.violations, `${route} has accessibility violations in ${theme} mode`).toEqual([]);
		}
	});
}
