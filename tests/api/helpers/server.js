import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '../../..');

export const SUPER_ADMIN = {
  email: 'admin@meridian.academy',
  password: 'Meridian@2026',
  newPassword: 'Meridian-Secure-2026',
};

export const TEACHER = {
  email: 'teacher@meridian.academy',
  password: 'Teacher@2026',
};

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function runPhp(args, env = {}) {
  const result = spawnSync('php', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });

  if (result.status !== 0) {
    throw new Error(
      `php ${args.join(' ')} failed (${result.status})\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  return result;
}

async function waitForHealth(baseUrl, child, output) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`PHP server exited early (${child.exitCode})\n${output()}`);
    }

    try {
      const response = await fetch(`${baseUrl}/api/v1/health`);
      if (response.ok) return;
    } catch {
      // Server not accepting connections yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 75));
  }

  throw new Error(`PHP server did not become healthy within 15s\n${output()}`);
}

/**
 * Starts the real PHP server on an ephemeral port against a throwaway SQLite
 * database. The returned object is the test seam: everything below the HTTP
 * boundary is free to change.
 */
export async function startTestServer() {
  const workDir = mkdtempSync(path.join(tmpdir(), 'meridian-api-'));
  const dbPath = path.join(workDir, 'test.sqlite');
  const storagePath = path.join(workDir, 'storage');
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = {
    MERIDIAN_ENV: 'test',
    MERIDIAN_DB_PATH: dbPath,
    MERIDIAN_STORAGE_PATH: storagePath,
  };

  runPhp(['scripts/db.php', 'setup', `--database=${dbPath}`], env);
  runPhp(['tests/api/fixtures/seed.php'], env);

  const child = spawn(
    'php',
    ['-S', `127.0.0.1:${port}`, '-t', path.join(REPO_ROOT, 'api/public'), path.join(REPO_ROOT, 'api/public/router.php')],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  );

  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    output += chunk.toString();
  });

  try {
    await waitForHealth(baseUrl, child, () => output);
  } catch (error) {
    child.kill();
    rmSync(workDir, { recursive: true, force: true });
    throw error;
  }

  return {
    baseUrl,
    dbPath,
    storagePath,
    logs: () => output,
    async stop() {
      await new Promise((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once('exit', resolve);
        child.kill();
        setTimeout(() => {
          if (child.exitCode === null) child.kill('SIGKILL');
        }, 2_000).unref();
      });
      rmSync(workDir, { recursive: true, force: true });
    },
  };
}

/**
 * Rebuilds the database behind a running test server. The server opens a new
 * PDO connection per request, so it observes the rebuilt schema and seed data.
 */
export function resetDatabase(server) {
  runPhp(
    ['scripts/db.php', 'fresh', `--database=${server.dbPath}`, `--storage=${server.storagePath}`],
    { MERIDIAN_ENV: 'test' },
  );
}

/**
 * A tiny cookie-aware HTTP client. It mirrors what the browser SPA does:
 * bootstrap a CSRF token, keep the httpOnly session cookie, send the CSRF
 * header on state-changing requests, and adopt rotated CSRF tokens.
 */
export function createClient(baseUrl) {
  const cookies = new Map();
  let csrfToken = null;

  function cookieHeader() {
    return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
  }

  function storeCookies(response) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const raw of setCookies) {
      const [pair, ...attributes] = raw.split(';');
      const index = pair.indexOf('=');
      if (index === -1) continue;
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      const expired = attributes.some((attribute) => {
        const [key, rawValue = ''] = attribute.trim().split('=');
        if (key.toLowerCase() === 'max-age') return Number(rawValue) <= 0;
        if (key.toLowerCase() === 'expires') return new Date(rawValue).getTime() <= Date.now();
        return false;
      });
      if (expired || value === '') cookies.delete(name);
      else cookies.set(name, value);
    }
  }

  async function request(pathname, options = {}) {
    const method = (options.method ?? 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...options.headers };
    const stateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookies.size > 0) headers.Cookie = cookieHeader();
    if (stateChanging && csrfToken && options.csrf !== false) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const response = await fetch(`${baseUrl}${pathname}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    storeCookies(response);

    const text = await response.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
    }

    if (json?.data?.csrfToken) csrfToken = json.data.csrfToken;
    return { response, json };
  }

  return {
    request,
    get: (pathname, options) => request(pathname, { ...options, method: 'GET' }),
    post: (pathname, body, options) => request(pathname, { ...options, method: 'POST', body }),
    get csrfToken() {
      return csrfToken;
    },
    set csrfToken(value) {
      csrfToken = value;
    },
    async bootstrapCsrf() {
      const { response, json } = await request('/api/v1/auth/csrf');
      if (!response.ok) throw new Error(`CSRF bootstrap failed: ${response.status} ${JSON.stringify(json)}`);
      csrfToken = json.data.csrfToken;
      return csrfToken;
    },
    async login(email, password) {
      await this.bootstrapCsrf();
      return this.post('/api/v1/auth/login', { email, password });
    },
  };
}
