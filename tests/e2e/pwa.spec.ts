import { test, expect } from '@playwright/test';

// --- FIN-QA-0200 through FIN-QA-0215: PWA tests ---

test.describe('FIN-QA-0200: PWA manifest validation', () => {
  test('manifest.json is accessible and valid', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    expect(response?.status()).toBe(200);

    const manifest = await response?.json();
    expect(manifest).toBeDefined();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    expect(manifest.start_url).toBeTruthy();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('manifest has required icon sizes for installability', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('manifest has maskable icons', async ({ page }) => {
    const response = await page.goto('/manifest.json');
    const manifest = await response?.json();

    const maskable = manifest.icons.filter(
      (i: { purpose?: string }) => i.purpose?.includes('maskable')
    );
    expect(maskable.length).toBeGreaterThan(0);
  });
});

test.describe('FIN-QA-0205: Service worker', () => {
  test('sw.js is accessible', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response?.status()).toBe(200);
    const contentType = response?.headers()['content-type'] || '';
    expect(contentType).toContain('javascript');
  });

  test('service worker registration is attempted', async ({ page }) => {
    await page.goto('/login');
    // Service workers may not fully register in Playwright's automated context
    // Verify the SW script is referenced in the page
    const swScript = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const pageSource = document.documentElement.innerHTML;
      return pageSource.includes('serviceWorker') || pageSource.includes('sw.js');
    });
    // The app references sw.js — actual registration depends on browser context
    expect(swScript).toBe(true);
  });
});

test.describe('FIN-QA-0210: Offline page', () => {
  test('offline.html is accessible', async ({ page }) => {
    const response = await page.goto('/offline.html');
    expect(response?.status()).toBe(200);

    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });
});

test.describe('FIN-QA-0213: PWA meta tags on login page', () => {
  test('has theme-color meta', async ({ page }) => {
    await page.goto('/login');
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
    expect(themeColor).toBeTruthy();
  });

  test('has manifest link', async ({ page }) => {
    await page.goto('/login');
    const manifestLink = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestLink).toContain('manifest');
  });

  test('has apple-touch-icon', async ({ page }) => {
    await page.goto('/login');
    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    const count = await appleIcon.count();
    expect(count).toBeGreaterThan(0);
  });
});
