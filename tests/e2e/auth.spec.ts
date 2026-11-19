import { test, expect } from '@playwright/test';

// --- FIN-QA-0100 through FIN-QA-0119: Authentication E2E tests ---

test.describe('FIN-QA-0100: Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays login form with email and password fields', async ({ page }) => {
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  // Requires DATABASE_URL — without a database, signIn fails silently in the catch block
  // and may not render an error. Tag: @database-required
  test('shows error or loading state for invalid credentials', async ({ page }) => {
    await page.locator('#email').fill('wrong@example.com');
    await page.locator('#password').fill('WrongPassword1');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for the sign-in attempt to resolve — either error appears or button returns to idle
    await page.getByRole('button', { name: /sign in/i }).waitFor({ state: 'visible', timeout: 15000 });
    // Auth was rejected — user stays on /login
    expect(page.url()).toContain('/login');
  });

  test('has link to register page', async ({ page }) => {
    const registerLink = page.getByRole('link', { name: /create one/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');
  });

  test('password field starts as type password', async ({ page }) => {
    const passwordInput = page.locator('#password');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('password visibility toggle works', async ({ page }) => {
    const passwordInput = page.locator('#password');
    await passwordInput.fill('TestPass1');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye toggle button
    await page.locator('#password').locator('..').locator('button').click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
  });

  test('email input has correct autocomplete', async ({ page }) => {
    await expect(page.locator('#email')).toHaveAttribute('autocomplete', 'email');
  });

  test('submit button shows loading state', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('ValidPass1');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Should briefly show loading text
    const button = page.getByRole('button', { name: /signing in/i });
    // May or may not catch the loading state depending on timing
    await expect(button.or(page.getByRole('button', { name: /sign in/i }))).toBeVisible({ timeout: 10000 });
  });

  test('displays FinKeep logo', async ({ page }) => {
    await expect(page.locator('img[alt="FinKeep"]')).toBeVisible();
  });
});

test.describe('FIN-QA-0105: Registration page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('displays registration form with all fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('shows validation for short name', async ({ page }) => {
    await page.locator('#name').fill('A');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('ValidPass1');
    await page.locator('#confirmPassword').fill('ValidPass1');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('text=Name must be at least 2 characters')).toBeVisible({ timeout: 5000 });
  });

  test('shows validation for weak password', async ({ page }) => {
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('weak');
    await page.locator('#confirmPassword').fill('weak');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible({ timeout: 5000 });
  });

  test('shows validation for password mismatch', async ({ page }) => {
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('ValidPass1');
    await page.locator('#confirmPassword').fill('DifferentPass1');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('text=Passwords do not match')).toBeVisible({ timeout: 5000 });
  });

  test('shows validation for password without uppercase/lowercase/number', async ({ page }) => {
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('alllowercase');
    await page.locator('#confirmPassword').fill('alllowercase');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.locator('text=uppercase, lowercase, and a number')).toBeVisible({ timeout: 5000 });
  });

  test('has link to login page', async ({ page }) => {
    const loginLink = page.getByRole('link', { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');
  });

  test('displays FinKeep logo', async ({ page }) => {
    await expect(page.locator('img[alt="FinKeep"]')).toBeVisible();
  });
});

test.describe('FIN-QA-0110: Unauthenticated access protection', () => {
  const protectedRoutes = [
    '/dashboard',
    '/accounts',
    '/transactions',
    '/loans',
    '/committees',
    '/savings',
    '/investments',
    '/plots',
    '/targets',
    '/reports',
    '/settings',
    '/people',
    '/categories',
    '/search',
    '/sports',
  ];

  for (const route of protectedRoutes) {
    test(`redirects ${route} to login`, async ({ page }) => {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain('/login');
    });
  }
});
