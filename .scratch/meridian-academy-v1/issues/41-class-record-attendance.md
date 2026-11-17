# 41: Class record — Attendance panel

**What to build:** The class record shows Attendance for one day and a summary for one Semester. The day view opens on today when today is a teaching day inside the Section's Academic Year, otherwise on the most recent date that has Attendance Records, and supports any date the user picks. A Semester selector defaults to the Semester containing that date. Per Student the panel shows present, absent, late, and excused counts with an attendance rate, and the Section shows totals and a rate. Roles without `attendance.view` see an explained panel instead of zeros, and data that was never recorded shows an empty state rather than `0%`.

**Blocked by:** 40 (Class record — Teachers, Subjects, and Timetable panels)

**Status:** ready-for-agent

- [ ] `GET /sections/{id}/attendance` accepts a date and Semester, resolves the default date by the calendar rule, reports which date it used, and returns the Section's Semesters, the selected Semester, the day roster with status and reason, per-Student counts and rate, and Section totals and rate.
- [ ] The endpoint requires `attendance.view` in addition to `academic.view` and applies the shared Teacher Section access rule.
- [ ] Attendance aggregation counts one status per Student per date: the daily record when present, otherwise per-period records collapsed by severity `absent`, `late`, `excused`, `present`.
- [ ] Attendance rate is `(present + late) / total` and is `null` when there are no records; the Section totals and per-Student figures agree.
- [ ] The day view defaults, accepts a picked date, lists active Students, and shows a true empty state when the Semester has no records.
- [ ] The Semester selector defaults to the Semester containing the resolved date and reloads the summary.
- [ ] Roles without `attendance.view` see a permission message in the panel while the rest of the record stays usable; the server also refuses the request.
- [ ] Tests cover the calendar default, an explicit date and Semester, the empty Semester, the per-period collapse, the rate formula, Teacher scoping, and the permission matrix.
- [ ] All new labels exist in English, Dari, and Pashto with Eastern digits and Solar Hijri dates; the i18n completeness check reports zero missing keys.

## Comments
