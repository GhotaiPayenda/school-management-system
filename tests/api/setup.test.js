import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import {
  SUPER_ADMIN,
  createClient,
  resetDatabase,
  startTestServer,
} from './helpers/server.js';

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server?.stop();
});

test('db.php fresh rebuilds a database that was already used', async () => {
  const client = createClient(server.baseUrl);
  const login = await client.login(SUPER_ADMIN.email, SUPER_ADMIN.password);
  assert.equal(login.response.status, 200);

  const changed = await client.post('/api/v1/auth/change-password', {
    currentPassword: SUPER_ADMIN.password,
    newPassword: SUPER_ADMIN.newPassword,
    newPasswordConfirmation: SUPER_ADMIN.newPassword,
  });
  assert.equal(changed.response.status, 200);

  // The temporary password is gone until the database is rebuilt.
  const retired = createClient(server.baseUrl);
  const rejected = await retired.login(SUPER_ADMIN.email, SUPER_ADMIN.password);
  assert.equal(rejected.response.status, 401);

  resetDatabase(server);

  const fresh = createClient(server.baseUrl);
  const accepted = await fresh.login(SUPER_ADMIN.email, SUPER_ADMIN.password);
  assert.equal(accepted.response.status, 200, accepted.json?.error?.code);
  assert.equal(accepted.json.data.user.mustChangePassword, true);
});