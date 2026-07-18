import { test, expect } from '@playwright/test';

test.describe('KoalaData Full E2E Flow', () => {
	const rand = Math.floor(Math.random() * 100000);
	const testUsername = `e2euser_${rand}`;
	const testPassword = `Password123!_${rand}`;

	test('should register, get approved by admin, login, and create a project', async ({ page }) => {
		// 1. Visit Register Page
		await page.goto('/register');
		await expect(page.locator('h1')).toContainText('Create Developer Account');

		// Fill in registration form
		await page.fill('input[name="username"]', testUsername);
		await page.fill('input[name="displayName"]', 'E2E Test Developer');
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');

		// 2. Redirected to login with pending notice
		await page.waitForURL('/login?*');
		await expect(page.locator('.alert-warning')).toContainText('Your registration is pending administrator review');

		// 3. Login as Admin to Approve the User
		await page.goto('/login');
		await page.fill('input[name="username"]', 'admin');
		await page.fill('input[name="password"]', 'admin_password');
		await page.click('button[type="submit"]');

		// Redirected to workspace or force change password if it's the first time
		await page.waitForURL('/**');

		// Navigate to Admin Queue
		await page.goto('/admin/registrations');
		await expect(page.locator('h1')).toContainText('Registrations Queue');

		// Locate user in the table and click approve
		const row = page.locator('tr', { hasText: testUsername });
		await expect(row).toBeVisible();
		await row.locator('button', { hasText: 'Approve' }).click();

		// Check success alert
		await expect(page.locator('.alert-success')).toContainText('User registration approved successfully.');

		// 4. Log out Admin (go to /app/account/security or clear cookies/goto login)
		await page.context().clearCookies();

		// 5. Login as the newly approved developer
		await page.goto('/login');
		await page.fill('input[name="username"]', testUsername);
		await page.fill('input[name="password"]', testPassword);
		await page.click('button[type="submit"]');

		// Land on workspace dashboard
		await page.waitForURL('/app');
		await expect(page.locator('h1')).toContainText('Developer Workspace');
		await expect(page.locator('body')).toContainText('Welcome, E2E Test Developer');

		// 6. Create a new project
		await page.click('a', { hasText: 'New Project' });
		await page.waitForURL('/app/projects/new');
		await expect(page.locator('h1')).toContainText('Create New Project');

		await page.fill('input[name="name"]', `E2E Extension ${rand}`);
		await page.selectOption('select[name="category"]', 'productivity');
		await page.selectOption('select[name="visibility"]', 'public');
		await page.fill('input[name="shortDescription"]', 'This is a test description for Playwright E2E.');
		await page.fill('textarea[name="fullDescription"]', 'This is a longer description of the extension features and capabilities for testing.');
		await page.click('button[type="submit"]');

		// Redirected to project dashboard page
		await page.waitForURL('/app/projects/*');
		await expect(page.locator('h1')).toContainText(`E2E Extension ${rand}`);
		await expect(page.locator('.badge-visibility-public')).toBeVisible();

		// 7. Verify public dashboard is accessible
		const slug = `e2e-extension-${rand}`;
		await page.goto(`/p/${slug}`);
		await expect(page.locator('h1')).toContainText(`E2E Extension ${rand}`);
	});
});
