import { test, expect } from '@playwright/test';

test.describe('FIN-QA-0700: Visual regression — login page', () => {
  test('login page layout matches baseline', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form')).toBeVisible();
    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });

  test('login page with filled fields', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.locator('#email').fill('user@example.com');
    await page.locator('#password').fill('TestPassword1');
    await expect(page).toHaveScreenshot('login-filled.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });
});

test.describe('FIN-QA-0710: Visual regression — registration page', () => {
  test('registration page layout matches baseline', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form')).toBeVisible();
    await expect(page).toHaveScreenshot('register-page.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });
});

test.describe('FIN-QA-0720: Visual regression — offline page', () => {
  test('offline page layout matches baseline', async ({ page }) => {
    await page.goto('/offline.html');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('offline-page.png', {
      maxDiffPixelRatio: 0.02,
      fullPage: true,
    });
  });
});
