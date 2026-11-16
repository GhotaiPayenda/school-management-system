# 30: Student portal

**What to build:** A Student signs in and sees only their own timetable, attendance history, results, published Report Cards, library Loans, and targeted Announcements, in the active language.

**Blocked by:** 13 (Daily attendance), 18 (Semester and Annual Report Cards), 20 (Monthly Invoice generation), 26 (Library loans, returns, and renewals), 28 (Announcements and targeting)

**Status:** done

- [x] A Student sees their own weekly timetable with Subjects, Teachers, Periods, Breaks, and Rooms.
- [x] A Student sees their attendance history and percentage, with statuses and reasons.
- [x] A Student sees published results and published Report Cards only, and can print a Report Card.
- [x] A Student sees current and past library Loans with due dates.
- [x] A Student sees Announcements targeted at them and can mark them read.
- [x] A Student cannot access another Student's data through the API or by changing an identifier.
- [x] API and browser tests cover data isolation, published-only visibility, locale output, print, and permission denial.

## Comments

- The student portal exposes only the signed-in student: weekly timetable, attendance history and percentage, published results and report cards, library loans, and targeted announcements with read state.
- `PortalRoute` plus controller ownership checks prevent access to another student by changing identifiers; published-only visibility is enforced in SQL.
- Report cards print through the shared print sheet; the API suite verifies student isolation and forbidden staff routes.
