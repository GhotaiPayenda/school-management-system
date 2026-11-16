# 13: Daily attendance

**What to build:** A Homeroom Teacher marks daily attendance for their Section, bulk-marks everyone present, records late or excused statuses with reasons, and sees daily summaries and per-Student percentages. Future dates and Holidays are blocked.

**Blocked by:** 07 (Staff records, teacher accounts, and Homeroom assignment), 08 (Period grids, breaks, and holidays), 11 (Admissions and Enrollment)

**Status:** done

- [x] A Homeroom Teacher can open today's attendance grid for an assigned Section and mark each Student present, absent, late, or excused.
- [x] A one-click "mark all present" action fills the grid, and saving the grid is atomic.
- [x] Late and excused statuses require an optional reason, and the reason is stored and displayed.
- [x] Future dates, Holidays, and dates outside the Academic Year are rejected for attendance marking.
- [x] A Teacher who is not the Section's Homeroom Teacher receives 403, and a Section with no Enrollments shows an empty state.
- [x] Daily summaries show counts by status, and a Student's attendance percentage matches (present + late) ÷ teaching days.
- [x] API and browser tests cover all statuses, reasons, bulk present, date and Holiday rejection, permissions, and percentage calculation.

## Comments

- `AttendanceController` implements the daily grid, present/absent/late/excused statuses, reasons, bulk present, atomic saving, and holiday/future/out-of-year rejection.
- Homeroom ownership is enforced server-side; summaries and rates use present + late over teaching days.
- `AttendancePage` provides the grid and summary; the admin journey opens the module.
