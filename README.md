# Meridian Academy

A single-tenant, self-hosted school management system for one K-12 school. The
repository contains a plain PHP JSON API, a React single-page application, and a
SQLite database with migrations and seeders.

This is the walking skeleton: authentication, sessions, CSRF protection, login
rate limiting, forced temporary-password change, role-based access control, and
a role-aware application shell. Academic, people, attendance, exam, finance, and
library modules arrive in later tickets.

## Requirements

- PHP 8.2 or newer with `pdo_sqlite`, `openssl`, and `mbstring`
- Node.js 22 or newer (Node 26 is what this repository is verified against)
- No Composer, framework, database server, or external service

## First run

```powershell
npm run setup
```

`setup` installs the SPA dependencies and runs migrations plus seeders against
`storage/meridian.sqlite`. To run the database steps alone:

```powershell
npm run db:setup
```

Start the API and the Vite dev server in two terminals:

```powershell
npm run dev:api
npm run dev:web
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` to `http://127.0.0.1:8000`.

### Seeded account

| Role        | Email                    | Temporary password |
| ----------- | ------------------------ | ------------------ |
| Super Admin | `admin@meridian.academy` | `Meridian@2026`    |

The first sign-in forces a password change. After the change, the temporary
password no longer works. Override the seed with `MERIDIAN_ADMIN_EMAIL` and
`MERIDIAN_ADMIN_PASSWORD` before running the seeder.

## Production-style run

Build the SPA, then serve both the SPA and the API from PHP's built-in server:

```powershell
npm run build
npm start
```

`api/public/router.php` sends `/api/*` to the PHP front controller, serves built
assets from `web/dist`, and falls back to `web/dist/index.html` for client-side
routes. Set `MERIDIAN_WEB_DIST` to use a different build directory.

Runtime data (the SQLite database, WAL files, uploads, and backups) lives in
`storage/` and is ignored by Git. The database directory is created on first
use.

### Configuration

Environment variables override the defaults in `api/config.php`:

| Variable                  | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `MERIDIAN_ENV`            | `local` (default) or `test`/production                        |
| `MERIDIAN_DB_PATH`        | SQLite file path, default `storage/meridian.sqlite`             |
| `MERIDIAN_STORAGE_PATH`   | Uploads and backups directory, default `storage/`               |
| `MERIDIAN_WEB_DIST`       | Built SPA directory, default `web/dist`                         |
| `MERIDIAN_SECURE_COOKIES` | `1` adds the `Secure` attribute to the session cookie          |
| `MERIDIAN_ADMIN_EMAIL`    | Email for the seeded Super Admin                               |
| `MERIDIAN_ADMIN_PASSWORD` | Temporary password for the seeded Super Admin                  |

## Quality gates

```powershell
php scripts/lint-php.php     # php -l over every PHP file
npm run test:api             # HTTP API integration tests, real PHP + SQLite
npm --prefix web run build   # production SPA build
```

The API suite starts a real PHP server on an ephemeral port with a throwaway
SQLite file, seeds it, and talks to it with Node's built-in test runner and
`fetch`. Every test case gets a fresh server and database; no case depends on
another case's order.

Browser smoke tests are a secondary, opt-in seam. See
[`web/e2e/README.md`](web/e2e/README.md) for the disposable-database command
sequence.

## Layout

```text
api/                    PHP front controller, router, middleware, controllers,
                        services, repositories, and support classes
api/public/             Web root: index.php and the built-in-server router
database/migrations/    Numbered .sql files applied once, in order
database/seeders/       Numbered .php files returning a callable(PDO)
scripts/                db.php (migrate/seed/fresh/status) and lint-php.php
storage/                Runtime database, uploads, and backups (ignored)
tests/api/              HTTP-seam integration tests and test-only fixtures
web/                    React + Vite SPA (plain JavaScript)
web/e2e/                Playwright smoke journeys (opt-in)
docs/                   Spec, shared understanding, ADRs, agent conventions
.scratch/               Local issue tracker tickets
```

## API conventions

These are fixed for later tickets.

- Base path: `/api/v1`.
- Success envelope: `{ "data": ... }`. List responses put the collection under a
  named key and add pagination metadata only where the list can grow.
- Error envelope:
  `{ "error": { "code", "messageKey", "message", "fields?" } }` with a correct
  HTTP status (`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`).
- `messageKey` is a stable translation key (`auth.invalidCredentials`,
  `errors.validation`, ...). The English `message` is a fallback; the SPA
  resolves the key through `web/src/i18n/messages.js`.
- Validation errors use `fields` mapping field names to translation keys.
- All SQL uses prepared statements. All timestamps are UTC ISO-8601 strings.
- Add routes in `api/src/Support/AppFactory.php` and declare middleware aliases
  explicitly. `auth`, `password.changed`, and `permission:<slug>` are the RBAC
  pipeline; `csrf` and security headers are global.
- Permissions are seeded in `database/seeders/001_roles_and_permissions.php` and
  enforced server-side. The UI hides unavailable navigation but is never the
  security boundary.
- New schema goes in a new numbered migration. Never edit an applied migration.
- New seed data goes in a new numbered seeder returning `callable(PDO)`. Seeders
  run once and must be idempotent where practical.
- New API tests go in `tests/api/*.test.js` and exercise the HTTP seam. Test
  fixtures live in `tests/api/fixtures/`; do not create test data through the
  production seed command.
- New SPA modules use Redux Toolkit slices with async thunks and the shared
  axios client in `web/src/api/client.js`. The client attaches CSRF tokens and
  normalizes errors; do not create a second HTTP client.
- The UI is English-first but must stay ready for Dari (`fa-AF`) and Pashto
  (`ps-AF`) RTL: strings belong in the message catalog and styles use logical
  properties. See ADR-0003.
- Use the vocabulary in [`GLOSSARY.md`](GLOSSARY.md) in code, tests, routes, and
  UI copy.

## Documentation

- [`docs/specs/meridian-academy-v1.md`](docs/specs/meridian-academy-v1.md) —
  full product spec and testing decisions
- [`docs/shared-understanding.md`](docs/shared-understanding.md) — build contract
- [`GLOSSARY.md`](GLOSSARY.md) — domain vocabulary
- [`docs/adr/`](docs/adr/) — hard-to-reverse technical decisions
- [`.scratch/meridian-academy-v1/issues/`](.scratch/meridian-academy-v1/issues/) —
  implementation tickets