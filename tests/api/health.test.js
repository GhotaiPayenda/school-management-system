import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { startTestServer } from './helpers/server.js';

let server;

before(async () => {
  server = await startTestServer();
});

after(async () => {
  await server?.stop();
});

test('health endpoint reports a reachable database', async () => {
  const response = await fetch(`${server.baseUrl}/api/v1/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.data.status, 'ok');
  assert.equal(body.data.checks.database, 'ok');
});
