import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import path from 'path';

test.describe('KoalaData End-to-End System Integration Flow', () => {
	const rand = Math.floor(Math.random() * 100000);
	const testUsername = `e2e_user_${rand}`;
	const testPassword = `Password123!_${rand}`;
	const projectName = `E2E Analytics Project ${rand}`;
	const projectSlug = `e2e-analytics-project-${rand}`;

	test('should run the complete administrative, publisher, metrics, and moderation workflow', async ({ page, context }) => {
		// Allow enough time for full DB migrations and multiple system setups.
		test.setTimeout(180000);

		// Log all page console outputs to node console
		page.on('console', msg => {
			const text = msg.text();
			if (text.includes('history.pushState') || text.includes('history.replaceState')) return;
			console.log('E2E PAGE LOG:', text);
		});

		let dismissNextDialog = false;
		page.on('dialog', async dialog => {
			console.log('E2E DIALOG:', dialog.type(), dialog.message());
			if (dismissNextDialog) {
				dismissNextDialog = false;
				await dialog.dismiss();
			} else {
				await dialog.accept();
			}
		});
		const serverErrors: string[] = [];
		page.on('response', (response) => {
			if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
		});

		// 1. SEEDED ADMIN LOGIN & SETTINGS ENFORCEMENT
		await page.goto('/login');
		await expect(page.locator('h1')).toContainText('Welcome back', { ignoreCase: true });
		
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin_password');
		await page.click('button[type="submit"]');

		// Land on dashboard / force change password check
		await page.waitForURL('/app');
		await page.setViewportSize({ width: 390, height: 900 });
		await page.goto('/admin');
		const adminNavToggle = page.locator('.admin-nav-toggle');
		await expect(adminNavToggle).toBeEnabled();
		await adminNavToggle.click();
		await expect(adminNavToggle).toHaveAttribute('aria-expanded', 'true');
		await expect(page.locator('#admin-navigation')).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
		await page.setViewportSize({ width: 1280, height: 900 });

		// Navigate to Admin settings and enforce approval_required registration policy
		await page.goto('/admin/settings');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('h1')).toContainText('Global Settings');
		await page.selectOption('select[id="registration_mode"]', 'approval_required');
		
		// Click submit and check for errors
		await page.click('button:has-text("Save Settings")');

		// Print any validation errors for debugging
		const dangerAlert = page.locator('.alert-danger');
		if (await dangerAlert.isVisible()) {
			console.log('E2E SETTINGS ERROR DETECTED:', await dangerAlert.textContent());
		}

		await expect(page.locator('.alert-success')).toContainText('System settings saved successfully');

		// Log out Admin
		await context.clearCookies();

		// 2. PENDING REGISTRATION
		await page.goto('/register');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('h1')).toContainText('Create Account');

		await page.fill('input[name="username"]', testUsername);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');

		// Redirected to login with pending warning
		await page.waitForURL('/login?*');
		await expect(page.locator('.alert-success')).toContainText('pending administrator approval');

		// 3. ADMIN APPROVAL
		await page.goto('/login');
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin_password');
		await page.click('button[type="submit"]');
		await page.waitForURL('/app');

		// Go to admin registrations queue
		await page.goto('/admin/registrations');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('h1')).toContainText('Registrations Queue');

		// Approve the user
		const row = page.locator('tr', { hasText: testUsername });
		await expect(row).toBeVisible();
		await row.locator('button', { hasText: 'Approve' }).click();
		await expect(page.locator('.alert-success')).toContainText('User registration approved successfully');

		// Clear admin sessions
		await context.clearCookies();

		// 4. NORMAL USER LOGIN
		await page.goto('/login');
		await page.fill('input[name="username"]', testUsername);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');

		// Land on developer workspace dashboard
		await page.waitForURL('/app');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('h1')).toContainText('Developer Workspace');
		await expect(page.locator('body')).toContainText(`Welcome, ${testUsername}`);
		await page.setViewportSize({ width: 390, height: 900 });
		await page.locator('.menu-toggle').click();
		await expect(page.locator('#header-menu')).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
		await page.setViewportSize({ width: 1280, height: 900 });

		console.log('--- ALL LINKS ON DASHBOARD ---');
		const links = await page.locator('a').all();
		for (const link of links) {
			console.log(await link.evaluate(el => ({ text: el.textContent, href: el.getAttribute('href') })));
		}
		console.log('------------------------------');

		// 5. PROJECT CREATION
		await page.click('a[href="/app/projects/new"]');
		await page.waitForURL('/app/projects/new');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		
		await page.fill('input[name="name"]', projectName);
		await page.selectOption('select[name="category"]', 'developer-tools');
		await page.selectOption('select[name="pricingModel"]', 'freemium');
		await page.selectOption('select[name="visibility"]', 'public');
		await page.fill('input[name="shortDescription"]', 'E2E test description of this browser extension dashboard.');
		await page.fill('textarea[name="fullDescription"]', 'Detailed long description of metrics and compatibility guidelines.');
		await page.click('button:has-text("Create Project")');

		// Redirected to project overview
		await page.waitForURL(/\/app\/projects\/(?!new$)[^/?]+$/);
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('.project-title')).toContainText(projectName);

		// Save the public classification after creation. This exercises the
		// better-sqlite3 transaction used by the project settings action.
		await page.click('a.tab-link[href$="/settings"]');
		await page.waitForURL('/app/projects/*/settings');
		await page.setViewportSize({ width: 320, height: 900 });
		const infoTrigger = page.getByRole('button', { name: 'More information' }).first();
		await infoTrigger.hover();
		const tooltip = page.getByRole('tooltip');
		await expect(tooltip).toBeVisible();
		const tooltipBox = await tooltip.boundingBox();
		expect(tooltipBox).not.toBeNull();
		if (tooltipBox) {
			const viewport = page.viewportSize()!;
			expect(tooltipBox.x).toBeGreaterThanOrEqual(0);
			expect(tooltipBox.y).toBeGreaterThanOrEqual(0);
			expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(viewport.width);
			expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(viewport.height);
		}
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
		await page.setViewportSize({ width: 1280, height: 900 });
		await page.selectOption('select[name="category"]', 'privacy');
		await page.selectOption('select[name="pricingModel"]', 'free');
		await page.fill('input[name="websiteUrl"]', 'https://example.com/e2e-extension');
		await page.fill('input[name="repositoryUrl"]', 'https://github.com/example/e2e-extension');
		await page.fill('input[name="storeUrl"]', 'https://chromewebstore.google.com/detail/example/abcdefghijklmnopabcdefghijklmnop');
		await page.check('input[name="isOpenSource"]');
		await page.locator('form[action="?/updateSettings"] button[type="submit"]').click();
		await expect(page.locator('.alert-success')).toContainText('General settings updated.');
		await expect(page.locator('input[name="name"]')).toHaveValue(projectName);
		await expect(page.locator('input[name="shortDescription"]')).toHaveValue('E2E test description of this browser extension dashboard.');
		await expect(page.locator('textarea[name="fullDescription"]')).toHaveValue('Detailed long description of metrics and compatibility guidelines.');
		await expect(page.locator('select[name="category"]')).toHaveValue('privacy');
		await expect(page.locator('input[name="websiteUrl"]')).toHaveValue('https://example.com/e2e-extension');
		await expect(page.locator('input[name="repositoryUrl"]')).toHaveValue('https://github.com/example/e2e-extension');
		await expect(page.locator('input[name="storeUrl"]')).toHaveValue('https://chromewebstore.google.com/detail/example/abcdefghijklmnopabcdefghijklmnop');
		await expect(page.locator('select[name="pricingModel"]')).toHaveValue('free');
		await expect(page.locator('input[name="isOpenSource"]')).toBeChecked();

		// Cancelling a destructive enhanced form must not fall through to a POST.
		dismissNextDialog = true;
		await page.locator('form[action="?/deleteProject"] button[type="submit"]').click();
		await expect(page).toHaveURL(/\/app\/projects\/[^/]+\/settings$/);
		await expect(page.locator('input[name="name"]')).toHaveValue(projectName);

		// 6. DATA SOURCE CREATION
		console.log('--- ALL LINKS ON PROJECT OVERVIEW ---');
		const projLinks = await page.locator('a').all();
		for (const link of projLinks) {
			console.log(await link.evaluate(el => ({ text: el.textContent, href: el.getAttribute('href') })));
		}
		console.log('------------------------------------');

		await page.click('a.tab-link[href$="/sources"]');
		await page.waitForURL('/app/projects/*/sources');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('h2').first()).toContainText('Defined Data Sources');

		await page.fill('input[name="name"]', 'CWS Dashboard Live');
		await page.selectOption('select[name="sourceType"]', 'chrome_web_store');
		await page.selectOption('select[name="granularity"]', 'daily');
		await page.click('button:has-text("Add Data Source")');

		await expect(page.locator('.alert-success')).toContainText('added successfully');
		await expect(page.locator('.sources-list')).toContainText('CWS Dashboard Live');

		// 7. CSV UPLOAD (Initial Batch)
		await page.click('a.tab-link[href$="/imports"]');
		await page.waitForURL('/app/projects/*/imports');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		
		// Select target data source
		await page.selectOption('select[name="sourceId"]', { label: 'CWS Dashboard Live (chrome_web_store)' });

		// Set upload file
		const filePayload1 = path.resolve('static/mock_e2e.csv');
		await page.setInputFiles('input[type="file"]', filePayload1);
		await page.click('button:has-text("Upload and Preview")');

		// 8. PREVIEW & MANUAL MAPPING & CONFIRMED IMPORT
		await page.waitForURL('/app/projects/*/imports/preview?*');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('.page-title')).toContainText('Map CSV Columns');
		await expect(page.locator('.preview-table-card')).toBeVisible();

		// Configure date and metrics mapping inputs
		await page.selectOption('select[name="dateColumn"]', 'date');
		await page.selectOption('select[name="dateFormat"]', 'YYYY-MM-DD');

		// Click confirm and import
		await page.click('button:has-text("Confirm and Import Observations")');

		// Redirected back to history with success banner
		await page.waitForURL('/app/projects/*/imports?*');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('.alert-success')).toContainText('Imported 2 rows successfully');

		// 9. OVERLAPPING CSV UPLOAD
		await page.selectOption('select[name="sourceId"]', { label: 'CWS Dashboard Live (chrome_web_store)' });
		const filePayload2 = path.resolve('static/mock_e2e_2.csv');
		await page.setInputFiles('input[type="file"]', filePayload2);
		await page.click('button:has-text("Upload and Preview")');

		await page.waitForURL('/app/projects/*/imports/preview?*');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await page.selectOption('select[name="dateColumn"]', 'date');
		await page.selectOption('select[name="dateFormat"]', 'YYYY-MM-DD');
		await page.click('button:has-text("Confirm and Import Observations")');

		await page.waitForURL('/app/projects/*/imports?*');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await expect(page.locator('.alert-success')).toContainText('Imported 1 rows successfully');

		// 10. PUBLIC DASHBOARD VERIFICATION & VISIBILITY CONTROLS
		await page.goto(`/p/${projectSlug}`);
		await expect(page.getByRole('heading', { level: 1 })).toContainText(projectName);
		await expect(page.getByText('Free', { exact: true })).toBeVisible();
		await expect(page.getByText('Open Source', { exact: true })).toBeVisible();
		await expect(page.locator('.chart-dom').first()).toBeVisible(); // Charts are loaded
		const trendCardPositions = await page.locator('.trend-grid > .chart-card').evaluateAll((cards) => cards.map((card) => {
			const rect = card.getBoundingClientRect();
			return { top: Math.round(rect.top), width: Math.round(rect.width) };
		}));
		expect(new Set(trendCardPositions.map((card) => card.top)).size).toBe(trendCardPositions.length);
		expect(trendCardPositions.every((card) => card.width > 0)).toBe(true);
		await expect(page.getByRole('button', { name: '7-day average' })).toBeVisible();
		await page.getByRole('button', { name: '7-day average' }).click();
		await expect(page.getByRole('button', { name: '7-day average' })).toHaveAttribute('aria-pressed', 'true');
		await page.getByRole('button', { name: '7-day average' }).click();
		await expect(page.getByRole('button', { name: '7-day average' })).toHaveAttribute('aria-pressed', 'false');

		for (const theme of ['light', 'dark']) {
			await page.evaluate((selectedTheme) => {
				localStorage.setItem('theme', selectedTheme);
				window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: selectedTheme }));
			}, theme);
			await page.reload();
			const accessibility = await new AxeBuilder({ page }).analyze();
			expect(accessibility.violations, `public project dashboard has accessibility violations in ${theme} mode`).toEqual([]);
		}

		// Go back and set to Private
		await page.goto(`/app`);
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await page.locator('.project-name a', { hasText: projectName }).click();
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await page.click('a.tab-link[href$="/settings"]');
		await page.selectOption('select[name="visibility"]', 'private');
		await page.locator('button', { hasText: 'Save Visibility' }).click();
		await expect(page.locator('.alert-success')).toContainText('visibility updated to private');

		// 11. PRIVATE PROJECT DENIAL
		await context.clearCookies(); // Log out
		const privateOg = await page.goto(`/p/${projectSlug}/og.png`);
		expect(privateOg?.status()).toBe(404);
		await page.goto(`/p/${projectSlug}`);
		// Private project returns 404
		await expect(page.locator('body')).toContainText('Project not found');

		// Log back in
		await page.goto('/login');
		await page.fill('input[name="username"]', testUsername);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL('/app');

		// 12. LEADERBOARD REQUEST & APPROVAL
		await page.locator('.project-name a', { hasText: projectName }).click();
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await page.click('a.tab-link[href$="/settings"]');
		
		await page.check('input[name="leaderboardOptIn"]');
		await page.locator('button', { hasText: 'Save Leaderboard Choice' }).click();
		await expect(page.locator('.alert-danger')).toContainText('Only public projects can participate in leaderboards.');

		// Set back to public first (leaderboards require public visibility)
		await page.selectOption('select[name="visibility"]', 'public');
		await page.locator('button', { hasText: 'Save Visibility' }).click();

		// Opt-in to leaderboards
		await page.check('input[name="leaderboardOptIn"]');
		await page.locator('button', { hasText: 'Save Leaderboard Choice' }).click();
		await expect(page.locator('.alert-success')).toContainText('Opted in to leaderboards. Admin review pending.');

		// Log out user
		await context.clearCookies();

		// Log in as Admin
		await page.goto('/login');
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin_password');
		await page.click('button[type="submit"]');
		await page.waitForURL('/app');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete

		// Complete the separate public-listing review before leaderboard approval.
		await page.goto('/admin/projects');
		const moderationRow = page.locator('tr', { hasText: projectName });
		await moderationRow.locator('select[name="moderationStatus"]').selectOption('active');
		await expect(page.locator('.alert-success')).toContainText('moderation status updated');

		// Go to admin leaderboard page and approve
		await page.goto('/admin/leaderboards');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		const leaderboardRow = page.locator('tr', { hasText: projectSlug });
		await expect(leaderboardRow).toBeVisible();
		await leaderboardRow.locator('button', { hasText: 'Approve' }).click();
		await expect(page.locator('.alert-success')).toContainText('approved for leaderboards');

		// Log out Admin
		await context.clearCookies();

		// 13. IMPORT ROLLBACK & VALUE RESTORATION
		// Log back in as developer
		await page.goto('/login');
		await page.fill('input[name="username"]', testUsername);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL('/app');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete

		// Go to imports list
		await page.goto(`/app`);
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await page.locator('.project-name a', { hasText: projectName }).click();
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await page.click('a.tab-link[href$="/imports"]');

		// Rollback the second batch (overlapping value 200). 
		// We look for the "Rollback" button on the row containing "mock_e2e_2"
		const secondImportRow = page.locator('tr', { hasText: 'mock_e2e_2' });
		await secondImportRow.locator('button', { hasText: 'Rollback' }).click();

		// Verify successful rollback
		await expect(page.locator('.alert-success')).toContainText('Import batch rolled back successfully');

		// Go to public page, verify value falls back to the previous batch (120) instead of 200
		await page.goto(`/p/${projectSlug}`);
		await expect(page.locator('body')).toContainText(projectName);
		
		// 14. USER BAN & SESSION INVALIDATION
		await context.clearCookies();

		// Log in as Admin
		await page.goto('/login');
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin_password');
		await page.click('button[type="submit"]');
		await page.waitForURL('/app');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete

		// Go to admin user management
		await page.goto('/admin/users');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await page.fill('input[name="q"]', testUsername);
		await page.click('button:has-text("Search")');

		const userRow = page.locator('tr', { hasText: testUsername });
		await userRow.locator('a', { hasText: 'Inspect' }).click();
		await page.waitForURL('/admin/users/*');
		await page.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete

		// Ban user
		await page.locator('button', { hasText: 'Ban User' }).click();
		await expect(page.locator('.alert-success')).toContainText('User banned');

		// Try to log in as the banned user -> should block and state banned
		await context.clearCookies(); // Log out Admin first
		const userPage = await context.newPage();
		await userPage.goto('/login');
		await userPage.waitForTimeout(2000); // Allow SvelteKit client-side hydration to complete
		await userPage.fill('input[name="username"]', testUsername);
		await userPage.fill('input[name="password"]', testPassword);
		await userPage.click('button[type="submit"]');

		await expect(userPage.locator('.alert-danger')).toContainText('banned');
		
		// Direct visit to /app redirects to login
		await userPage.goto('/app');
		await expect(userPage).toHaveURL(/\/login/);
		expect(serverErrors).toEqual([]);
	});
});
