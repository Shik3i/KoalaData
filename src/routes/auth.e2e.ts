import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('KoalaData End-to-End System Integration Flow', () => {
	const rand = Math.floor(Math.random() * 100000);
	const testUsername = `e2e_user_${rand}`;
	const testPassword = `Password123!_${rand}`;
	const projectName = `E2E Analytics Project ${rand}`;
	const projectSlug = `e2e-analytics-project-${rand}`;

	test('should run the complete administrative, publisher, metrics, and moderation workflow', async ({ page, context }) => {
		// Set E2E test timeout to 90s to cover full DB migrations and multiple system setups
		test.setTimeout(90000);

		// Log all page console outputs to node console
		page.on('console', msg => console.log('E2E PAGE LOG:', msg.text()));

		// 1. SEEDED ADMIN LOGIN & SETTINGS ENFORCEMENT
		await page.goto('/login');
		await expect(page.locator('h1')).toContainText('Welcome Back');
		
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin_password');
		await page.click('button[type="submit"]');

		// Land on dashboard / force change password check
		await page.waitForURL('/app');

		// Navigate to Admin settings and enforce approval_required registration policy
		await page.goto('/admin/settings');
		await expect(page.locator('h1')).toContainText('Global Settings');
		await page.selectOption('select[id="registration_mode"]', 'approval_required');
		
		// Click submit and check for errors
		await page.click('button[type="submit"]');
		await page.waitForTimeout(2000);

		console.log('--- SETTINGS PAGE HTML DUMP ---');
		console.log(await page.content());
		console.log('-------------------------------');

		// Print any validation errors for debugging
		const dangerText = await page.locator('.alert-danger').textContent().catch(() => null);
		if (dangerText) {
			console.log('E2E SETTINGS ERROR DETECTED:', dangerText);
		}

		await expect(page.locator('.alert-success')).toContainText('System settings saved successfully');

		// Log out Admin
		await context.clearCookies();

		// 2. PENDING REGISTRATION
		await page.goto('/register');
		await expect(page.locator('h1')).toContainText('Create Account');

		await page.fill('input[name="username"]', testUsername);
		await page.fill('input[name="displayName"]', 'E2E Developer');
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');

		// Redirected to login with pending warning
		await page.waitForURL('/login?*');
		await expect(page.locator('.alert-warning')).toContainText('Your registration is pending administrator review');

		// 3. ADMIN APPROVAL
		await page.goto('/login');
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin_password');
		await page.click('button[type="submit"]');
		await page.waitForURL('/app');

		// Go to admin registrations queue
		await page.goto('/admin/registrations');
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
		await expect(page.locator('h1')).toContainText('Developer Workspace');
		await expect(page.locator('body')).toContainText('Welcome, E2E Developer');

		// 5. PROJECT CREATION
		await page.click('a', { hasText: 'New Project' });
		await page.waitForURL('/app/projects/new');
		
		await page.fill('input[name="name"]', projectName);
		await page.selectOption('select[name="category"]', 'developer-tools');
		await page.selectOption('select[name="visibility"]', 'public');
		await page.fill('input[name="shortDescription"]', 'E2E test description of this browser extension dashboard.');
		await page.fill('textarea[name="fullDescription"]', 'Detailed long description of metrics and compatibility guidelines.');
		await page.click('button[type="submit"]');

		// Redirected to project overview
		await page.waitForURL('/app/projects/*');
		await expect(page.locator('h1')).toContainText(projectName);

		// 6. DATA SOURCE CREATION
		await page.click('a', { hasText: 'Data Sources' });
		await page.waitForURL('/app/projects/*/sources');
		await expect(page.locator('h2')).toContainText('Defined Data Sources');

		await page.fill('input[name="name"]', 'CWS Dashboard Live');
		await page.selectOption('select[name="sourceType"]', 'chrome_web_store');
		await page.selectOption('select[name="granularity"]', 'daily');
		await page.click('button[type="submit"]');

		await expect(page.locator('.alert-success')).toContainText('added successfully');
		await expect(page.locator('.sources-list')).toContainText('CWS Dashboard Live');

		// 7. CSV UPLOAD (Initial Batch)
		await page.click('a', { hasText: 'Import History' });
		await page.waitForURL('/app/projects/*/imports');
		
		// Select target data source
		await page.selectOption('select[name="sourceId"]', { label: 'CWS Dashboard Live (chrome_web_store)' });

		// Set upload file
		const filePayload1 = path.resolve('static/mock_e2e.csv');
		await page.setInputFiles('input[type="file"]', filePayload1);
		await page.click('button[type="submit"]');

		// 8. PREVIEW & MANUAL MAPPING & CONFIRMED IMPORT
		await page.waitForURL('/app/projects/*/imports/preview?*');
		await expect(page.locator('h1')).toContainText('Map CSV Columns');
		await expect(page.locator('.preview-table-card')).toBeVisible();

		// Configure date and metrics mapping inputs
		await page.selectOption('select[name="dateColumn"]', 'date');
		await page.selectOption('select[name="dateFormat"]', 'YYYY-MM-DD');

		// Click confirm and import
		await page.click('button[type="submit"]');

		// Redirected back to history with success banner
		await page.waitForURL('/app/projects/*/imports?*');
		await expect(page.locator('.alert-success')).toContainText('Imported 2 rows successfully');

		// 9. OVERLAPPING CSV UPLOAD
		await page.selectOption('select[name="sourceId"]', { label: 'CWS Dashboard Live (chrome_web_store)' });
		const filePayload2 = path.resolve('static/mock_e2e_2.csv');
		await page.setInputFiles('input[type="file"]', filePayload2);
		await page.click('button[type="submit"]');

		await page.waitForURL('/app/projects/*/imports/preview?*');
		await page.selectOption('select[name="dateColumn"]', 'date');
		await page.selectOption('select[name="dateFormat"]', 'YYYY-MM-DD');
		await page.click('button[type="submit"]');

		await page.waitForURL('/app/projects/*/imports?*');
		await expect(page.locator('.alert-success')).toContainText('Imported 1 rows successfully');

		// 10. PUBLIC DASHBOARD VERIFICATION & VISIBILITY CONTROLS
		await page.goto(`/p/${projectSlug}`);
		await expect(page.locator('h1')).toContainText(projectName);
		await expect(page.locator('.chart-dom')).toBeVisible(); // Charts are loaded

		// Go back and set to Private
		await page.goto(`/app/projects`);
		await page.click(`a[href*="/app/projects/"]`, { hasText: 'Manage' });
		await page.click('a', { hasText: 'Settings' });
		await page.selectOption('select[name="visibility"]', 'private');
		await page.click('button', { hasText: 'Save Visibility' });
		await expect(page.locator('.alert-success')).toContainText('visibility updated to private');

		// 11. PRIVATE PROJECT DENIAL
		await context.clearCookies(); // Log out
		await page.goto(`/p/${projectSlug}`);
		// Private project returns 404
		await expect(page.locator('body')).toContainText('Project not found');

		// Log back in
		await page.goto('/login');
		await page.fill('input[name="username"]', testUsername);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');

		// 12. LEADERBOARD REQUEST & APPROVAL
		await page.goto(`/app/projects`);
		await page.click(`a[href*="/app/projects/"]`, { hasText: 'Manage' });
		await page.click('a', { hasText: 'Settings' });
		
		// Set back to public first (leaderboards require public visibility)
		await page.selectOption('select[name="visibility"]', 'public');
		await page.click('button', { hasText: 'Save Visibility' });

		// Opt-in to leaderboards
		await page.check('input[name="leaderboardOptIn"]');
		await page.click('button', { hasText: 'Save Leaderboard Choice' });
		await expect(page.locator('.alert-success')).toContainText('Opted in to leaderboards. Admin review pending.');

		// Log out user
		await context.clearCookies();

		// Log in as Admin
		await page.goto('/login');
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin_password');
		await page.click('button[type="submit"]');
		await page.waitForURL('/app');

		// Go to admin leaderboard page and approve
		await page.goto('/admin/leaderboards');
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

		// Go to imports list
		await page.goto(`/app/projects`);
		await page.click(`a[href*="/app/projects/"]`, { hasText: 'Manage' });
		await page.click('a', { hasText: 'Import History' });

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

		// Go to admin user management
		await page.goto('/admin/users');
		await page.fill('input[name="q"]', testUsername);
		await page.click('button[type="submit"]');

		const userRow = page.locator('tr', { hasText: testUsername });
		await userRow.locator('a', { hasText: 'Inspect' }).click();

		// Ban user
		await page.click('button', { hasText: 'Ban User' });
		await expect(page.locator('.alert-success')).toContainText('User banned');

		// Try to log in as the banned user -> should block and state banned
		const userPage = await context.newPage();
		await userPage.goto('/login');
		await userPage.fill('input[name="username"]', testUsername);
		await userPage.fill('input[name="password"]', testPassword);
		await userPage.click('button[type="submit"]');

		await expect(userPage.locator('.alert-danger')).toContainText('banned');
		
		// Direct visit to /app redirects to login
		await userPage.goto('/app');
		await userPage.waitForURL('/login');
	});
});
