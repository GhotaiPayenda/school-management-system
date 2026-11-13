import { expect, test } from '@playwright/test';

const adminEmail = process.env.MERIDIAN_E2E_ADMIN_EMAIL || 'admin@meridian.academy';
const temporaryPassword = process.env.MERIDIAN_E2E_TEMP_PASSWORD || 'Meridian@2026';
const newPassword = process.env.MERIDIAN_E2E_NEW_PASSWORD || 'Meridian-Secure-2026';

/**
 * This journey mutates the database once (the temporary password is retired).
 * Run it only against a freshly seeded, disposable database.
 *
 *   MERIDIAN_E2E=1 npm run test:e2e
 */
test.skip(!process.env.MERIDIAN_E2E, 'Set MERIDIAN_E2E=1 with a fresh seeded database.');

test('Super Admin signs in, is forced to change the temporary password, and can log out', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.getByLabel('Email').fill(adminEmail);
  await page.getByLabel('Password').fill(temporaryPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(
    page.getByRole('heading', { name: 'Replace your temporary password' }),
  ).toBeVisible();

  await page.getByLabel('Current temporary password').fill(temporaryPassword);
  await page.getByLabel('New password', { exact: true }).fill(newPassword);
  await page.getByLabel('Confirm new password').fill(newPassword);
  await page.getByRole('button', { name: 'Save password and continue' }).click();

  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('Dashboard');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('Roles');

  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});

test('a Teacher cannot open the Roles screen', async ({ page }) => {
  test.skip(!process.env.MERIDIAN_E2E_TEACHER_PASSWORD, 'Set MERIDIAN_E2E_TEACHER_PASSWORD for the RBAC journey.');

  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.MERIDIAN_E2E_TEACHER_EMAIL || 'teacher@meridian.academy');
  await page.getByLabel('Password').fill(process.env.MERIDIAN_E2E_TEACHER_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).not.toContainText('Roles');

  await page.goto('/admin/roles');
  await expect(page.getByRole('heading', { name: 'This screen is outside your role.' })).toBeVisible();
});
