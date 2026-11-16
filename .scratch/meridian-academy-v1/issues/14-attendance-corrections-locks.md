# 14: Attendance corrections, month locks, and per-Period mode

**What to build:** A Teacher corrects the current day's attendance, an Admin corrects any date until the month closes, the month can be locked and reopened with an audited reason, optional per-Period attendance can be enabled, and attendance history and CSV export are available.

**Blocked by:** 13 (Daily attendance)

**Status:** done

- [x] A Homeroom Teacher can edit today's Attendance Records, and the change is visible immediately.
- [x] An Admin can correct any date in an open month, but a closed month rejects edits with a clear error.
- [x] An Admin can close a month, and reopening it requires a written reason and creates an Audit Entry.
- [x] Per-Period attendance can be enabled in settings; when disabled, daily attendance remains the only mode, and when enabled, Period-level records coexist with the daily summary.
- [x] A Student's attendance history shows each date, status, reason, and recorder.
- [x] Attendance CSV export uses localized headers and respects the active filters.
- [x] API and browser tests cover the correction window, month close and reopen, per-Period mode, history, export, and permission denial.

## Comments

- Attendance corrections, month locks with reasoned reopening, per-period mode, history, and filtered CSV export are implemented in `AttendanceController`.
- Reopening and corrections create Audit Entries; the `AttendancePage` exposes locks, history, and export controls.
- The API suite covers the attendance surface and role isolation.
