import { expect, test } from '@playwright/test';

const adminEmail = process.env.MERIDIAN_E2E_ADMIN_EMAIL || 'admin@meridian.academy';
const temporaryPassword = process.env.MERIDIAN_E2E_TEMP_PASSWORD || 'Meridian@2026';
const newPassword = process.env.MERIDIAN_E2E_NEW_PASSWORD || 'Meridian-Secure-2026';
const teacherEmail = process.env.MERIDIAN_E2E_TEACHER_EMAIL || 'teacher.demo@meridian.academy';
const teacherPassword = process.env.MERIDIAN_E2E_TEACHER_PASSWORD || 'Meridian@2026';
const guardianEmail = process.env.MERIDIAN_E2E_GUARDIAN_EMAIL || 'guardian.demo@meridian.academy';
const guardianPassword = process.env.MERIDIAN_E2E_GUARDIAN_PASSWORD || 'Meridian@2026';

/**
 * These journeys mutate the database once (the temporary password is retired).
 * Run them only against a freshly seeded, disposable database.
 *
 *   MERIDIAN_E2E=1 npm run test:e2e
 */
test.skip(!process.env.MERIDIAN_E2E, 'Set MERIDIAN_E2E=1 with a fresh seeded database.');

test.beforeEach(async ({ page }) => {
  page.setDefaultTimeout(60_000);
  page.setDefaultNavigationTimeout(60_000);
});

async function signIn(page, email, password) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function expectPageHealthy(page) {
  await page.locator('.loading-block').first().waitFor({ state: 'detached', timeout: 60_000 });
  await expect(page.locator('.page-title')).toBeVisible();
  await expect(page.locator('.state-error')).toHaveCount(0);
}

test('Super Admin signs in, changes the temporary password, and opens every module', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await signIn(page, adminEmail, temporaryPassword);

  await expect(page.getByRole('heading', { name: 'Replace your temporary password' })).toBeVisible();
  await page.locator('input[name="currentPassword"]').fill(temporaryPassword);
  await page.locator('input[name="newPassword"]').fill(newPassword);
  await page.locator('input[name="newPasswordConfirmation"]').fill(newPassword);
  await page.getByRole('button', { name: 'Save password and continue' }).click();
  await page.waitForURL('/');
  await expectPageHealthy(page);

  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('Dashboard');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('Classes');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('Roles & access');

  const modules = [
    ['/classes', 'Classes'],
    ['/academic', 'Academic setup'],
    ['/timetable', 'Timetable'],
    ['/admissions', 'Admissions & enrollment'],
    ['/students', 'Students'],
    ['/staff', 'Staff'],
    ['/attendance', 'Attendance'],
    ['/exams', 'Examinations'],
    ['/results', 'Results & report cards'],
    ['/finance', 'Finance'],
    ['/library', 'Library'],
    ['/announcements', 'Announcements'],
    ['/audit', 'Audit trail'],
    ['/operations', 'Operations'],
    ['/settings', 'School settings'],
    ['/admin/roles', 'Roles & access'],
  ];

  for (const [path, title] of modules) {
    await page.goto(path, { waitUntil: 'networkidle' });
    await expect(page.locator('.page-title')).toContainText(title);
    await expectPageHealthy(page);
  }

  await page.goto('/classes');
  await expectPageHealthy(page);
  await expect.poll(() => page.locator('.class-year-group').count()).toBeGreaterThan(0);
  await expect.poll(() => page.locator('.class-grade-group').count()).toBeGreaterThan(0);
  await expect.poll(() => page.locator('.class-card').count()).toBeGreaterThan(0);

  await page.locator('.class-card').first().click();
  await expect(page).toHaveURL(/\/classes\/\d+$/);
  await expect(page.locator('.page-title')).toContainText('Section');
  await expect(page.locator('.back-link')).toBeVisible();
  await expect(page.locator('select[aria-label="Academic year"]')).toBeVisible();
  await expect.poll(() => page.locator('.data-table tbody tr').count()).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'Teachers', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Subjects', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Timetable', exact: true })).toBeVisible();
  await page.locator('.back-link').click();
  await expect(page).toHaveURL(/\/classes$/);

  await page.locator('.class-card').first().click();
  await expect(page.locator('.data-table tbody tr').first()).toBeVisible();
  await page.locator('.data-table tbody tr').first().click();
  await expect(page).toHaveURL(/\/students\?studentId=\d+/);
  await expect(page.locator('.modal-content')).toBeVisible();

  await page.goto('/settings');
  await expect(page.locator('input[name="name"], .settings-layout input').first()).toBeVisible();

  await page.locator('.user-menu-trigger').click();
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test('print surfaces render for timetables, exams, report cards, receipts, ID cards, and class lists', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await signIn(page, adminEmail, newPassword);
  await page.waitForURL('/');
  await expectPageHealthy(page);

  await page.goto('/timetable');
  await expectPageHealthy(page);
  await expect(page.getByRole('button', { name: 'Print' }).first()).toBeVisible();
  await expect.poll(() => page.locator('.print-only .timetable tbody tr').count()).toBeGreaterThan(0);

  await page.goto('/exams');
  await expectPageHealthy(page);
  await page.getByRole('tab', { name: 'Exam schedules' }).click();
  await expect.poll(() => page.locator('.print-only .result-table tbody tr').count()).toBeGreaterThan(0);

  await page.goto('/results');
  await expectPageHealthy(page);
  await page.getByRole('tab', { name: 'Report cards' }).click();
  await page.getByRole('button', { name: 'Open report card' }).first().click();
  await expect(page.locator('.report-sheet')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();

  await page.goto('/finance');
  await expectPageHealthy(page);
  await page.getByRole('tab', { name: 'Payments' }).click();
  await page.getByRole('button', { name: 'Receipt', exact: true }).first().click();
  await expect(page.locator('.print-area')).toContainText('Receipt');
  await expect(page.locator('body')).toHaveClass(/has-print-sheet/);
  await page.getByRole('button', { name: 'Close' }).first().click();

  await page.goto('/students');
  await expectPageHealthy(page);
  await page.locator('.filter-bar select').nth(1).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Class list' }).click();
  await expect(page.locator('.print-area .result-table tbody tr').first()).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();
  await page.getByRole('button', { name: 'Student ID card' }).first().click();
  await expect(page.locator('.id-card')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).first().click();

  expect(pageErrors).toEqual([]);
});

test('a Teacher cannot open the Roles screen', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await signIn(page, teacherEmail, teacherPassword);
  await page.waitForURL('/');
  await expectPageHealthy(page);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).not.toContainText('Roles & access');

  await page.goto('/admin/roles');
  await expect(page.getByRole('heading', { name: 'This screen is outside your role.' })).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test('the shell switches language, RTL, digits, and theme, and persists them', async ({ page }) => {
  await signIn(page, teacherEmail, teacherPassword);
  await page.waitForURL('/');
  await expectPageHealthy(page);

  const html = page.locator('html');
  await expect(html).toHaveAttribute('dir', 'ltr');

  const initialTheme = await html.getAttribute('data-theme');
  const nextTheme = initialTheme === 'dark' ? 'light' : 'dark';
  await page.getByRole('button', { name: initialTheme === 'dark' ? 'Light' : 'Dark' }).click();
  await expect(html).toHaveAttribute('data-theme', nextTheme);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('meridian.theme'))).toBe(nextTheme);

  await page.reload();
  await expect(html).toHaveAttribute('data-theme', nextTheme);

  await page.locator('.topbar-controls select').selectOption('fa-AF');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(html).toHaveAttribute('lang', 'fa-AF');
  await expect(page.locator('.sidebar-nav')).toContainText('داشبورد');
  await expect(page.locator('.page-header .eyebrow')).toContainText('۱۴۰۵');
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem('meridian.language'))).toBe('fa-AF');

  await page.reload();
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.sidebar-nav')).toContainText('داشبورد');

  await page.locator('.topbar-controls select').selectOption('ps-AF');
  await expect(html).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('.sidebar-nav')).toContainText('ډشبورډ');
});

test('a Guardian opens the family portal without staff screens', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await signIn(page, guardianEmail, guardianPassword);
  await expect(page).toHaveURL(/\/portal$/);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('My fees');
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('My reports');
  await expectPageHealthy(page);

  for (const [path, title] of [
    ['/portal/fees', 'Fees'],
    ['/portal/reports', 'Report cards'],
  ]) {
    await page.goto(path);
    await expect(page.locator('.page-title')).toContainText(title);
    await expectPageHealthy(page);
  }

  await page.goto('/staff');
  await expect(page.getByRole('heading', { name: 'This screen is outside your role.' })).toBeVisible();

  expect(pageErrors).toEqual([]);
});
