# 30: Student portal

**What to build:** A Student signs in and sees only their own timetable, attendance history, results, published Report Cards, library Loans, and targeted Announcements, in the active language.

**Blocked by:** 13 (Daily attendance), 18 (Semester and Annual Report Cards), 20 (Monthly Invoice generation), 26 (Library loans, returns, and renewals), 28 (Announcements and targeting)

**Status:** ready-for-agent

- [ ] A Student sees their own weekly timetable with Subjects, Teachers, Periods, Breaks, and Rooms.
- [ ] A Student sees their attendance history and percentage, with statuses and reasons.
- [ ] A Student sees published results and published Report Cards only, and can print a Report Card.
- [ ] A Student sees current and past library Loans with due dates.
- [ ] A Student sees Announcements targeted at them and can mark them read.
- [ ] A Student cannot access another Student's data through the API or by changing an identifier.
- [ ] API and browser tests cover data isolation, published-only visibility, locale output, print, and permission denial.