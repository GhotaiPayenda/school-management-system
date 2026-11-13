# 01: Walking skeleton: login, roles, and empty dashboard

**What to build:** A seeded Super Admin can sign in, change the temporary password, see a role-aware application shell, reach a protected API, and log out. This establishes the PHP 8.2 + PDO + SQLite foundation, session authentication, CSRF protection, the RBAC skeleton, the React SPA shell, and the first API and browser tests.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A fresh setup creates the SQLite database, runs migrations, and seeds one Super Admin with a temporary password.
- [ ] Correct credentials start an httpOnly session and return the User, Role, and Permissions; wrong credentials return 401 with a localized error.
- [ ] First login forces a password change, and the temporary password no longer works afterward.
- [ ] Logout destroys the session, and a protected endpoint returns 401 afterward.
- [ ] A Role without a Permission receives 403 from the API and cannot reach the corresponding UI route.
- [ ] API integration tests and a browser smoke test cover login, forced password change, logout, and a forbidden action.