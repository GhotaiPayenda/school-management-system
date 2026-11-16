#!/usr/bin/env node
/**
 * Starts the PHP API and the Vite dev server together.
 *
 *   npm run dev            (all platforms)
 *   .\dev.ps1              (PowerShell, from the repository root)
 *
 * Prefixes each server's output with [api] or [web]. Ctrl+C stops both.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB_DIR = path.join(ROOT, 'web');
const VITE_BIN = path.join(WEB_DIR, 'node_modules', 'vite', 'bin', 'vite.js');
const API_URL = 'http://127.0.0.1:8000';
const WEB_URL = 'http://127.0.0.1:5173';

const children = [];
let shuttingDown = false;

function prefixStream(stream, prefix, target) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) target.write(`${prefix} ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer) target.write(`${prefix} ${buffer}\n`);
  });
}

function run(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? ROOT,
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const label = `[${name}]`;
  prefixStream(child.stdout, label, process.stdout);
  prefixStream(child.stderr, label, process.stderr);

  child.on('error', (error) => {
    process.stderr.write(`${label} failed to start: ${error.message}\n`);
    stop(1);
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
    process.stderr.write(`${label} stopped unexpectedly (${reason}).\n`);
    stop(code ?? 1);
  });

  children.push(child);
  return child;
}

function killTree(child) {
  if (child.exitCode !== null) return;
  if (process.platform === 'win32') {
    // npm starts Vite in a child process, so kill the whole tree.
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    child.kill('SIGTERM');
  }
}

function stop(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) killTree(child);
  setTimeout(() => process.exit(code), 300).unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
process.on('SIGHUP', () => stop(0));

if (!existsSync(VITE_BIN)) {
  process.stderr.write(
    'Vite is not installed. Run `npm run setup` (or `npm run install:web`) first.\n',
  );
  process.exit(1);
}

process.stdout.write(
  `Meridian Academy dev servers\n  API  ${API_URL}\n  Web  ${WEB_URL}\nPress Ctrl+C to stop both.\n\n`,
);

run('api', process.platform === 'win32' ? 'php.exe' : 'php', [
  '-S',
  '127.0.0.1:8000',
  '-t',
  'api/public',
  'api/public/router.php',
]);

run('web', process.execPath, [VITE_BIN, '--host', '127.0.0.1'], { cwd: WEB_DIR });
