# 29: Admin and Teacher dashboards

**What to build:** A Principal sees whole-school KPIs, attendance trends, fee collection, upcoming Exams, and recent activity; a Teacher sees assigned Sections, today's Timetable, pending attendance and marking tasks, and relevant Announcements. All data is role-scoped.

**Blocked by:** 09 (Teaching Assignments and weekly Timetable), 13 (Daily attendance), 16 (Exam score entry and publication), 20 (Monthly Invoice generation), 28 (Announcements and targeting)

**Status:** done

- [x] A Principal dashboard shows enrollment, attendance rate, expected versus collected fees, upcoming Exams, and recent activity.
- [x] A Teacher dashboard shows only assigned Sections, today's Lessons, Sections missing attendance, Exams awaiting marks, and relevant Announcements.
- [x] Dashboard aggregates respect Permissions and do not leak data from other Sections or Roles.
- [x] Charts include an accessible textual summary and use the design system's color tokens.
- [x] Empty and loading states are present for every dashboard card.
- [x] API and browser tests cover aggregate values, role scoping, permission denial, chart summaries, and empty states.

## Comments

- `DashboardController` returns role-scoped cards, tasks, enrollment charts, attendance and finance aggregates, upcoming exams, activity, and announcements.
- Teacher dashboards are limited to assigned sections, lessons, missing attendance, and marking work; aggregates respect permissions.
- `DashboardPage` renders Recharts visuals with textual summaries plus loading, empty, and error states.
