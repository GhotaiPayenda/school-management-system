# 35: Backup, restore, and health check

**What to build:** A Super Admin downloads a consistent SQLite backup, restores a backup with explicit confirmation, and sees database, storage, and last-backup health. A failed restore leaves the original database intact.

**Blocked by:** 01 (Walking skeleton: login, roles, and empty dashboard)

**Status:** done

- [x] A Super Admin can download a consistent SQLite database backup.
- [x] Restore requires an explicit confirmation naming the backup, replaces the database only after validation, and leaves the original intact on failure.
- [x] The health check reports database reachability, writable storage, and last backup time, with clear pass or fail states.
- [x] Only the Super Admin can download, restore, or view health details.
- [x] Backup and restore actions create Audit Entries.
- [x] API and browser tests cover backup creation, successful restore, failed restore rollback, health output, audit, and permission denial.

## Comments

- `OperationsController` creates consistent SQLite backups, lists/downloads/deletes them, and restores only after validating the SQLite image plus table/column compatibility inside a transaction.
- Failed restores leave the original database intact; health reports database reachability, writable storage, and last backup state.
- Only the Super Admin can use operations routes, and backup/restore actions create Audit Entries. `OperationsPage` exposes the flows.
