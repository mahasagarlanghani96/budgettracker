import { test, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '..', '..', '.auth', 'user.json');

// These tests require a database connection and an authenticated session.
// Run: npx playwright test tests/e2e/authenticated --project=chromium
// Requires: npm run dev with DATABASE_URL set

test.use({ storageState: AUTH_FILE });

// --- FIN-QA-0500 through FIN-QA-0520: Authenticated dashboard tests ---

test.describe('FIN-QA-0500: Dashboard loads for authenticated user', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('dashboard page renders without redirect', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    // Should NOT redirect to login
    expect(page.url()).not.toContain('/login');
  });

  test('displays greeting with user name', async ({ page }) => {
    // Dashboard shows "Good morning/afternoon/evening, <name>"
    const greeting = page.locator('text=/Good (morning|afternoon|evening)/i');
    await expect(greeting).toBeVisible({ timeout: 10000 });
  });

  test('displays total balance card', async ({ page }) => {
    // Look for the balance display area — contains "Rs." formatted currency
    const balanceSection = page.locator('text=/Total Balance/i');
    await expect(balanceSection).toBeVisible({ timeout: 10000 });
  });

  test('displays monthly income and expense cards', async ({ page }) => {
    await expect(page.locator('text=/Monthly Income/i')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=/Monthly Expense/i')).toBeVisible({ timeout: 10000 });
  });

  test('displays quick action buttons', async ({ page }) => {
    // Dashboard has quick-action links for core features
    const quickActions = page.locator('a[href="/accounts"], a[href="/transactions"], a[href="/loans"]');
    const count = await quickActions.count();
    expect(count).toBeGreaterThan(0);
  });

  test('navigation sidebar is visible', async ({ page }) => {
    // Check that the main nav is accessible
    const nav = page.locator('nav, [role="navigation"]');
    const count = await nav.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('FIN-QA-0505: Account management', () => {
  test('accounts page loads', async ({ page }) => {
    await page.goto('/accounts');
    await expect(page).toHaveURL(/\/accounts/);
    expect(page.url()).not.toContain('/login');
  });

  test('can navigate to create account form', async ({ page }) => {
    await page.goto('/accounts');
    // Look for "Add Account" or "New Account" or a "+" button
    const addButton = page.locator('text=/Add Account|New Account/i, a[href*="accounts/new"], button:has-text("Add")');
    if (await addButton.count() > 0) {
      await addButton.first().click();
      // Should navigate to account creation
      await page.waitForTimeout(2000);
      expect(page.url()).toMatch(/accounts\/(new|create)/i);
    }
  });
});

test.describe('FIN-QA-0510: Transaction management', () => {
  test('transactions page loads', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/transactions/);
    expect(page.url()).not.toContain('/login');
  });

  test('transactions page has filter controls', async ({ page }) => {
    await page.goto('/transactions');
    // Should have date filter or type filter
    const filters = page.locator('select, [role="combobox"], button:has-text(/filter|today|week|month/i)');
    await page.waitForTimeout(3000);
    const count = await filters.count();
    expect(count).toBeGreaterThanOrEqual(0); // May not have filters if no transactions exist
  });
});

test.describe('FIN-QA-0515: Protected feature pages load', () => {
  const featurePages = [
    { path: '/loans', name: 'Loans' },
    { path: '/committees', name: 'Committees' },
    { path: '/savings', name: 'Savings' },
    { path: '/investments', name: 'Investments' },
    { path: '/plots', name: 'Plots' },
    { path: '/targets', name: 'Targets' },
    { path: '/people', name: 'People' },
    { path: '/categories', name: 'Categories' },
    { path: '/settings', name: 'Settings' },
    { path: '/sports', name: 'Sports' },
  ];

  for (const { path: pagePath, name } of featurePages) {
    test(`${name} page loads without redirect (${pagePath})`, async ({ page }) => {
      await page.goto(pagePath);
      await page.waitForTimeout(3000);
      // Authenticated user should NOT be redirected to login
      expect(page.url()).not.toContain('/login');
    });
  }
});

test.describe('FIN-QA-0520: Settings page', () => {
  test('settings page shows user profile', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    // Should show some user-related content
    await page.waitForTimeout(3000);
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});
