import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import {
  SUPER_ADMIN,
  TEACHER,
  createClient,
  startTestServer,
} from './helpers/server.js';

// Every case gets its own PHP server and SQLite file, so no case can depend on
// another case having run first.
let server;

beforeEach(async () => {
  server = await startTestServer();
});

afterEach(async () => {
  await server?.stop();
  server = null;
});

/**
 * Signs in as the seeded Super Admin and retires the temporary password, which
 * is the state most authenticated flows run from.
 */
async function unlockSuperAdmin(client) {
  const login = await client.login(SUPER_ADMIN.email, SUPER_ADMIN.password);
  assert.equal(login.response.status, 200);
  assert.equal(login.json.data.user.mustChangePassword, true);

  const changed = await client.post('/api/v1/auth/change-password', {
    currentPassword: SUPER_ADMIN.password,
    newPassword: SUPER_ADMIN.newPassword,
    newPasswordConfirmation: SUPER_ADMIN.newPassword,
  });
  assert.equal(changed.response.status, 200);
  assert.equal(changed.json.data.user.mustChangePassword, false);

  return changed.json.data;
}

test('CSRF bootstrap sets an httpOnly SameSite session cookie', async () => {
  const client = createClient(server.baseUrl);
  const { response, json } = await client.get('/api/v1/auth/csrf');

  assert.equal(response.status, 200);
  assert.equal(typeof json.data.csrfToken, 'string');
  assert.ok(json.data.csrfToken.length >= 32);

  const setCookie = response.headers.getSetCookie().join('; ');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);

  const me = await client.get('/api/v1/auth/me');
  assert.equal(me.response.status, 401);
});

test('wrong credentials return 401 with a stable localized error', async () => {
  const client = createClient(server.baseUrl);
  const { response, json } = await client.login(SUPER_ADMIN.email, 'not-the-password');

  assert.equal(response.status, 401);
  assert.equal(json.error.code, 'invalid_credentials');
  assert.equal(json.error.messageKey, 'auth.invalidCredentials');
  assert.ok(json.error.message.length > 0);
});

test('state-changing requests without a CSRF token are rejected', async () => {
  const client = createClient(server.baseUrl);
  await client.bootstrapCsrf();

  const { response, json } = await client.post(
    '/api/v1/auth/login',
    { email: SUPER_ADMIN.email, password: SUPER_ADMIN.password },
    { csrf: false },
  );

  assert.equal(response.status, 403);
  assert.equal(json.error.code, 'csrf_token_invalid');
});

test('correct credentials return the User, Role, Permissions, and a forced change flag', async () => {
  const client = createClient(server.baseUrl);
  const bootstrappedToken = await client.bootstrapCsrf();
  const { response, json } = await client.post('/api/v1/auth/login', {
    email: SUPER_ADMIN.email,
    password: SUPER_ADMIN.password,
  });

  assert.equal(response.status, 200);
  assert.equal(json.data.user.email, SUPER_ADMIN.email);
  assert.equal(json.data.user.mustChangePassword, true);
  assert.equal(json.data.role.slug, 'super-admin');
  assert.ok(json.data.permissions.includes('dashboard.view'));
  assert.ok(json.data.permissions.includes('roles.manage'));
  assert.notEqual(json.data.csrfToken, bootstrappedToken);
  assert.equal(JSON.stringify(json).includes('password_hash'), false);

  const me = await client.get('/api/v1/auth/me');
  assert.equal(me.response.status, 200);
  assert.equal(me.json.data.user.email, SUPER_ADMIN.email);

  const blocked = await client.get('/api/v1/dashboard');
  assert.equal(blocked.response.status, 403);
  assert.equal(blocked.json.error.code, 'password_change_required');
});

test('changing the temporary password unlocks the app and retires the temporary password', async () => {
  const client = createClient(server.baseUrl);
  await client.login(SUPER_ADMIN.email, SUPER_ADMIN.password);

  const changed = await client.post('/api/v1/auth/change-password', {
    currentPassword: SUPER_ADMIN.password,
    newPassword: SUPER_ADMIN.newPassword,
    newPasswordConfirmation: SUPER_ADMIN.newPassword,
  });

  assert.equal(changed.response.status, 200);
  assert.equal(changed.json.data.user.mustChangePassword, false);

  const dashboard = await client.get('/api/v1/dashboard');
  assert.equal(dashboard.response.status, 200);
  assert.equal(dashboard.json.data.greeting.includes('Super Admin'), true);

  await client.post('/api/v1/auth/logout');

  const oldLogin = createClient(server.baseUrl);
  const rejected = await oldLogin.login(SUPER_ADMIN.email, SUPER_ADMIN.password);
  assert.equal(rejected.response.status, 401);
  assert.equal(rejected.json.error.code, 'invalid_credentials');

  const newLogin = createClient(server.baseUrl);
  const accepted = await newLogin.login(SUPER_ADMIN.email, SUPER_ADMIN.newPassword);
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.json.data.user.mustChangePassword, false);
});

test('changing the password rejects a missing CSRF token and a wrong current password', async () => {
  const client = createClient(server.baseUrl);
  await client.login(SUPER_ADMIN.email, SUPER_ADMIN.password);

  const noCsrf = await client.post(
    '/api/v1/auth/change-password',
    {
      currentPassword: SUPER_ADMIN.password,
      newPassword: SUPER_ADMIN.newPassword,
      newPasswordConfirmation: SUPER_ADMIN.newPassword,
    },
    { csrf: false },
  );
  assert.equal(noCsrf.response.status, 403);
  assert.equal(noCsrf.json.error.code, 'csrf_token_invalid');

  const wrongCurrent = await client.post('/api/v1/auth/change-password', {
    currentPassword: 'not-the-current-password',
    newPassword: SUPER_ADMIN.newPassword,
    newPasswordConfirmation: SUPER_ADMIN.newPassword,
  });
  assert.equal(wrongCurrent.response.status, 422);
  assert.equal(wrongCurrent.json.error.code, 'validation_failed');
  assert.equal(wrongCurrent.json.error.fields.currentPassword, 'auth.currentPasswordInvalid');

  const stillBlocked = await client.get('/api/v1/dashboard');
  assert.equal(stillBlocked.response.status, 403);
  assert.equal(stillBlocked.json.error.code, 'password_change_required');
});

test('logout destroys the session and protected endpoints return 401 afterwards', async () => {
  const client = createClient(server.baseUrl);
  await unlockSuperAdmin(client);

  const logout = await client.post('/api/v1/auth/logout');
  assert.equal(logout.response.status, 204);

  const me = await client.get('/api/v1/auth/me');
  assert.equal(me.response.status, 401);
  assert.equal(me.json.error.code, 'unauthenticated');

  const dashboard = await client.get('/api/v1/dashboard');
  assert.equal(dashboard.response.status, 401);
});

test('a Role without a Permission receives 403 while its allowed endpoint still works', async () => {
  const teacher = createClient(server.baseUrl);
  const login = await teacher.login(TEACHER.email, TEACHER.password);

  assert.equal(login.response.status, 200);
  assert.equal(login.json.data.role.slug, 'teacher');
  assert.equal(login.json.data.user.mustChangePassword, false);
  assert.equal(login.json.data.permissions.includes('roles.manage'), false);

  const dashboard = await teacher.get('/api/v1/dashboard');
  assert.equal(dashboard.response.status, 200);

  const forbidden = await teacher.get('/api/v1/roles');
  assert.equal(forbidden.response.status, 403);
  assert.equal(forbidden.json.error.code, 'forbidden');

  const admin = createClient(server.baseUrl);
  await unlockSuperAdmin(admin);
  const allowed = await admin.get('/api/v1/roles');
  assert.equal(allowed.response.status, 200);
  assert.ok(allowed.json.data.roles.some((role) => role.slug === 'teacher'));
});

test('repeated failed sign-ins are rate-limited', async () => {
  const client = createClient(server.baseUrl);
  await client.bootstrapCsrf();

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const { response } = await client.post('/api/v1/auth/login', {
      email: 'nobody@meridian.academy',
      password: `wrong-${attempt}`,
    });
    assert.equal(response.status, 401, `attempt ${attempt} should be rejected as invalid credentials`);
  }

  const { response, json } = await client.post('/api/v1/auth/login', {
    email: 'nobody@meridian.academy',
    password: 'wrong-again',
  });
  assert.equal(response.status, 429);
  assert.equal(json.error.code, 'too_many_attempts');
  assert.equal(response.headers.get('retry-after'), '900');
});