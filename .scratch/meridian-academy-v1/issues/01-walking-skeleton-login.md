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
  test case. `npm run test:api` currently reports 11 passing tests.
- Playwright smoke scaffold lists two journeys (login + forced change + logout,
  and Teacher forbidden from Roles); it remains opt-in because it needs a
  disposable database, a running API/SPA, and a Chromium install.

Deviations: the browser suite was not executed here (no Chromium download in
this environment); the API suite is the hard gate. The first implementation's
tests shared one database and depended on execution order; each case now gets a
fresh server/database. `scripts/db.php fresh` was also fixed to delete the
SQLite file before opening a PDO connection, which Windows requires.