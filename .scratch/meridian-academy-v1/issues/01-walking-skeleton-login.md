# 01: Walking skeleton: login, roles, and empty dashboard

**What to build:** A seeded Super Admin can sign in, change the temporary password, see a role-aware application shell, reach a protected API, and log out. This establishes the PHP 8.2 + PDO + SQLite foundation, session authentication, CSRF protection, the RBAC skeleton, the React SPA shell, and the first API and browser tests.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A fresh setup creates the SQLite database, runs migrations, and seeds one Super Admin with a temporary password.
- [x] Correct credentials start an httpOnly session and return the User, Role, and Permissions; wrong credentials return 401 with a localized error.
- [x] First login forces a password change, and the temporary password no longer works afterward.
- [x] Logout destroys the session, and a protected endpoint returns 401 afterward.
- [x] A Role without a Permission receives 403 from the API and cannot reach the corresponding UI route.
- [x] API integration tests and a browser smoke test cover login, forced password change, logout, and a forbidden action.

## Comments

Implemented on `ticket/01-walking-skeleton` (2026-11-13).

- PHP 8.2 + PDO + SQLite foundation: front controller, router, middleware pipeline,
  migration runner, seeder runner, container, and `scripts/db.php` (`setup`,
  `migrate`, `seed`, `fresh`, `status`).
- Session auth with httpOnly/SameSite cookies, token rotation on login and
  password change, 8-hour inactivity expiry, CSRF for every state-changing
  request, and per-email/per-IP login throttling (5 failures in 15 minutes).
- Forced temporary-password change, logout, RBAC via `auth`,
  `password.changed`, and `permission:<slug>` middleware, plus the seeded
  Super Admin and all eight Roles/Permissions.
- React/Vite plain-JavaScript SPA: login, forced change-password, role-aware
  shell, dashboard placeholder, read-only Roles screen, forbidden and not-found
  screens, session bootstrap, and axios CSRF/error handling.
- HTTP-seam API tests run a real PHP server against a disposable SQLite file per
  test case. `npm run test:api` currently reports 13 passing tests, including the
  full domain surface and Student/Guardian/Teacher isolation.
- The Playwright suite now executes on Chromium and covers five journeys: the
  Super Admin forced password change plus every staff module, the printable
  timetable/exam/report-card/receipt/ID-card/class-list surfaces, Teacher RBAC,
  language/RTL/digits/theme persistence, and Guardian portal isolation. It stays
  opt-in because it needs a disposable database and running API/SPA servers.

Update (2026-11-16): the browser suite was executed successfully against a
rebuilt `storage/e2e.sqlite` (5 passing journeys); the API suite passes 13/13,
`php scripts/lint-php.php` passes 56 files, and the production SPA build
succeeds. `scripts/db.php fresh` deletes the SQLite file before opening a PDO
connection, which Windows requires.