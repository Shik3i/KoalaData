import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicRoutes = ['/', '/discover', '/leaderboards', '/login', '/register', '/privacy', '/imprint', '/terms', '/security'];

for (const width of [320, 390, 768, 1920]) {
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
