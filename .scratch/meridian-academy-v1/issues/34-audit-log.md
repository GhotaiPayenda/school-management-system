# 34: Audit log

**What to build:** A Super Admin views and filters immutable Audit Entries by actor, module, and date, including score publication, payments, discounts, refunds, month locks, and other privileged changes with their reasons.

**Blocked by:** 16 (Exam score entry and publication), 21 (Payments, Receipts, and Student ledger), 23 (Refunds, credits, and arrears)

**Status:** done

- [x] Privileged actions across grading and finance create an Audit Entry with actor, timestamp, action, entity, entity identifier, reason where required, and a before/after summary.
- [x] A Super Admin can filter Audit Entries by actor, module, date range, and action, with pagination.
- [x] Audit Entries cannot be edited or deleted through the application or the API.
- [x] Non-admin Roles cannot read the audit log.
- [x] The audit UI shows enough context to understand what changed without exposing secrets or password hashes.
- [x] API and browser tests cover entry creation, filtering, immutability, and permission denial.

## Comments

- `AuditService` records actor, timestamp, module, action, entity, identifier, reason, IP, and before/after payloads for privileged academic, finance, attendance, library, announcement, settings, and operations actions.
- `AuditController` provides filtered, paginated reads only; no write/update/delete route exists, and non-admin roles receive 403.
- `AuditPage` shows a readable detail view without secrets; the admin journey opens the audit module.
