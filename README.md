# Meridian Academy

A single-tenant, self-hosted K-12 school management system for one school of
roughly 3,000 students and 200 staff. The repository contains a plain PHP JSON
API, a React single-page application, and a SQLite database with migrations and
seeders.

The v1 modules cover academic setup, timetables, people and admissions,
attendance, exams and results, report cards, class records (Classes), finance,
the library, announcements, audit history, backup and restore, CSV import and
export, and role-specific staff, student, and guardian portals.

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

Start both servers from the repository root with one command:

```powershell
npm run dev
```

The launcher prefixes output with `[api]` and `[web]`; press Ctrl+C to stop
both. In PowerShell you can also run `.\dev.ps1`. To run the servers in separate
terminals instead:

```powershell
npm run dev:api
npm run dev:web
```

Open <http://127.0.0.1:5173>. Vite proxies `/api` to `http://127.0.0.1:8000`.

## Seeded accounts

The first sign-in for the Super Admin forces a password change. After the
change, the temporary password no longer works. Override the Super Admin seed
with `MERIDIAN_ADMIN_EMAIL` and `MERIDIAN_ADMIN_PASSWORD`.

| Role        | Email                       | Password           |
| ----------- | --------------------------- | ------------------ |
| Super Admin | `admin@meridian.academy`    | `Meridian@2026`    |
| Principal   | `principal.demo@meridian.academy` | `Meridian@2026` |
| Registrar   | `registrar.demo@meridian.academy` | `Meridian@2026` |
| Accountant  | `accountant.demo@meridian.academy` | `Meridian@2026` |
| Librarian   | `librarian.demo@meridian.academy` | `Meridian@2026` |
| Teacher     | `teacher.demo@meridian.academy` | `Meridian@2026` |
| Student     | `student.demo@meridian.academy` | `Meridian@2026` |
| Guardian    | `guardian.demo@meridian.academy` | `Meridian@2026` |

The demo school seeds 12 Grade Levels, two Sections per grade, 144 students,
14 staff members, timetables, attendance, First and Final Exams with scores,
supplementary examples, published report cards, fee structures, issued invoices,
payments, library loans and fines, announcements, applicants, and audit entries.
The demo academic year is generated relative to the current date while keeping
the Afghan March-to-January shape.

## Classes

**Classes** in the sidebar opens a read-only view of Section records grouped by
Academic Year and Grade Level. Any staff Role with the `academic.view`
Permission can open it; Student and Guardian cannot, and a Teacher only sees the
Sections they lead or teach.

Each class record shows the roster, Homeroom Teacher, Teaching Assignments, the
Grade Level curriculum with unstaffed Subjects flagged, the weekly Timetable,
Attendance for a chosen day and Semester, and published Results. **Print class
profile** produces one localized sheet.

`academic.view` is seeded, not migrated. On an existing database, rerun the
seeder to grant it to the six Staff Roles:

```powershell
npm run db:seed
```

Reset the demo at any time:

```powershell
npm run db:fresh
```

`fresh` deletes the SQLite file, reapplies every migration, and reruns every
seeder.

## Production-style run

Build the SPA, then serve both the SPA and the API from PHP's built-in server:

```powershell
npm run build
npm start
```

`api/public/router.php` sends `/api/*` to the PHP front controller, serves built
assets from `web/dist`, and falls back to `web/dist/index.html` for client-side
routes. Set `MERIDIAN_WEB_DIST` to use a different build directory.

For a normal deployment, point nginx or Apache at `api/public` and let the same
front controller serve `/api/v1` while a static host serves `web/dist`.

Runtime data (the SQLite database, WAL files, uploads, and backups) lives in
`storage/` and is ignored by Git. The database directory is created on first
use.

### Configuration

Environment variables override the defaults in `api/config.php`:

| Variable                  | Purpose                                                        |
| ------------------------- | -------------------------------------------------------------- |
| `MERIDIAN_ENV`            | `local` (default) or `test`/production                         |
| `MERIDIAN_DB_PATH`        | SQLite file path, default `storage/meridian.sqlite`            |
| `MERIDIAN_STORAGE_PATH`   | Uploads and backups directory, default `storage/`              |
| `MERIDIAN_WEB_DIST`       | Built SPA directory, default `web/dist`                        |
| `MERIDIAN_SECURE_COOKIES` | `1` adds the `Secure` attribute to the session cookie          |
| `MERIDIAN_ADMIN_EMAIL`    | Email for the seeded Super Admin                               |
| `MERIDIAN_ADMIN_PASSWORD` | Temporary password for the seeded Super Admin                  |

## Languages, dates, and themes

The interface defaults to English and includes complete Dari (`fa-AF`) and
Pashto (`ps-AF`) catalogs. Switching language in the top bar sets the document
direction to RTL for Dari and Pashto, swaps to Arabic-script fonts, and renders
dates with the Solar Hijri calendar and Eastern Arabic-Indic digits. Stored dates
remain ISO Gregorian strings.

The light and dark themes use the same design tokens. Language and theme choices
are stored in `meridian.language` and `meridian.theme` in `localStorage`, so they
survive reloads and sign-in.

## Printing

Report cards, payment receipts, section timetables, exam schedules, student ID
cards, and section class lists each render a dedicated print sheet with the
school identity header. Open the record and choose **Print**; when a dialog is
open the application shell is hidden so only the document reaches the printer.
The sheets follow the active language, direction, digits, and calendar.

## Backups and restore

A Super Admin can create, download, and delete SQLite backups from **Operations**
or through the API:

- `GET /api/v1/operations/info`
- `GET /api/v1/operations/backups`
- `POST /api/v1/operations/backups`
- `GET /api/v1/operations/backups/{id}/download`
- `DELETE /api/v1/operations/backups/{id}`
- `POST /api/v1/operations/restore`

Restore validates the uploaded SQLite image and its table and column
compatibility before copying it over the live database inside a transaction. A
failed restore leaves the original database intact. Backup and restore actions
create Audit Entries.

## Quality gates

```powershell
php scripts/lint-php.php     # php -l over every PHP file
npm run test:api             # HTTP API integration tests, real PHP + SQLite
npm run check:i18n           # no missing translation keys
npm --prefix web run build   # production SPA build
```

The API suite starts a real PHP server on an ephemeral port with a throwaway
SQLite file, seeds it, and talks to it with Node's built-in test runner and
`fetch`. Every test case gets a fresh server and database; no case depends on
another case's order.

Browser smoke tests are a secondary, opt-in seam. They need a disposable
database and both servers:

```powershell
$env:MERIDIAN_DB_PATH = "$PWD\storage\e2e.sqlite"
$env:MERIDIAN_STORAGE_PATH = "$PWD\storage\e2e-storage"
php scripts/db.php fresh --database="$env:MERIDIAN_DB_PATH" --storage="$env:MERIDIAN_STORAGE_PATH"
# Terminal 1
php -S 127.0.0.1:8000 -t api/public api/public/router.php
# Terminal 2
npm --prefix web run dev
# Terminal 3
$env:MERIDIAN_E2E = "1"
npm run test:e2e
```

The browser journeys cover the forced password change and every staff module,
the printable timetable, exam schedule, report card, receipt, ID card, class
list, and class profile surfaces, a complete class record, Teacher RBAC,
Guardian portal isolation, and language/RTL/theme persistence. The admin journey
changes the temporary password, so rebuild the disposable database before
rerunning the suite. See
[`web/e2e/README.md`](web/e2e/README.md) for details.

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
  axios client in `web/src/api/client.js`. The client attaches CSRF tokens,
  retries safe reads after a transient network failure, and normalizes errors;
  do not create a second HTTP client.
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
