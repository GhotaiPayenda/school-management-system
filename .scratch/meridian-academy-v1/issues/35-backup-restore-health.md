# 35: Backup, restore, and health check

**What to build:** A Super Admin downloads a consistent SQLite backup, restores a backup with explicit confirmation, and sees database, storage, and last-backup health. A failed restore leaves the original database intact.

**Blocked by:** 01 (Walking skeleton: login, roles, and empty dashboard)

**Status:** ready-for-agent

- [ ] A Super Admin can download a consistent SQLite database backup.
- [ ] Restore requires an explicit confirmation naming the backup, replaces the database only after validation, and leaves the original intact on failure.
- [ ] The health check reports database reachability, writable storage, and last backup time, with clear pass or fail states.
- [ ] Only the Super Admin can download, restore, or view health details.
- [ ] Backup and restore actions create Audit Entries.
- [ ] API and browser tests cover backup creation, successful restore, failed restore rollback, health output, audit, and permission denial.