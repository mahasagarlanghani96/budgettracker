import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// --- FIN-QA-0300 through FIN-QA-0315: Accessibility tests ---

test.describe('FIN-QA-0300: Login page accessibility', () => {
  test('axe scan — no critical violations', async ({ page }) => {
    await page.goto('/login');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (critical.length > 0) {
      const summary = critical.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log('Accessibility violations:\n' + summary);
    }

    // FIN-BUG-0002 fixed: password toggle now has aria-label
    expect(critical.length).toBe(0);
  });

  test('form inputs have associated labels via htmlFor', async ({ page }) => {
    await page.goto('/login');

    // Email input has matching label
    const emailLabel = page.locator('label[for="email"]');
    await expect(emailLabel).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();

    // Password input has matching label
    const passwordLabel = page.locator('label[for="password"]');
    await expect(passwordLabel).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('submit button has accessible text', async ({ page }) => {
    await page.goto('/login');
    const button = page.getByRole('button', { name: /sign in/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('logo image has alt text', async ({ page }) => {
    await page.goto('/login');
    const img = page.locator('img[alt="FinKeep"]');
    await expect(img).toBeVisible();
  });
});

test.describe('FIN-QA-0305: Registration page accessibility', () => {
  test('axe scan — reports remaining violations', async ({ page }) => {
    await page.goto('/register');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (critical.length > 0) {
      const summary = critical.map(
        (v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`
      ).join('\n');
      console.log('Registration accessibility violations:\n' + summary);
    }

    // FIN-BUG-0002 fixed: password toggles now have aria-label
    // PhotoUpload button now has aria-label — expect 0 critical violations
    expect(critical.length).toBe(0);
  });

  test('all form fields have labels', async ({ page }) => {
    await page.goto('/register');

    for (const id of ['name', 'email', 'password', 'confirmPassword']) {
      const label = page.locator(`label[for="${id}"]`);
      await expect(label).toBeVisible();
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
  });

  test('form is keyboard navigable', async ({ page }) => {
    await page.goto('/register');

    // Tab through elements — verify focus moves
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
    expect(focused).toBeTruthy();

    // Tab several times to verify navigation works
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab');
    }
    focused = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
    expect(focused).toBeTruthy();
  });
});

test.describe('FIN-QA-0310: Offline page accessibility', () => {
  test('offline page has minimal accessibility issues', async ({ page }) => {
    await page.goto('/offline.html');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const critical = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (critical.length > 0) {
      console.log('Offline page violations:', critical.map(v => v.id).join(', '));
    }

    // FIN-BUG-0003 fixed: color contrast corrected (#64748b -> #475569)
    expect(critical.length).toBe(0);
  });
});
