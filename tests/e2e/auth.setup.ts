import { test as setup, expect } from '@playwright/test';
import path from 'path';

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json');

const TEST_USER = {
  name: 'FinKeep Test User',
  email: `testuser_${Date.now()}@finkeep-test.local`,
  password: 'TestPass123!',
};

setup('register and authenticate test user', async ({ page, request }) => {
  // Step 1: Register via API
  const registerRes = await request.post('/api/auth/register', {
    data: {
      name: TEST_USER.name,
      email: TEST_USER.email,
      password: TEST_USER.password,
      confirmPassword: TEST_USER.password,
    },
  });

  // 201 = new user, 400 = might already exist — both acceptable
  expect([201, 400]).toContain(registerRes.status());

  // Step 2: Log in via the UI (creates the session cookie)
  await page.goto('/login');
  await page.locator('#email').fill(TEST_USER.email);
  await page.locator('#password').fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Step 3: Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
  expect(page.url()).toContain('/dashboard');

  // Step 4: Save storage state (cookies + localStorage)
  await page.context().storageState({ path: AUTH_FILE });
});

export { AUTH_FILE, TEST_USER };
