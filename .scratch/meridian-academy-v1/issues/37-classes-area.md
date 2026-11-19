# 37: Classes area — class records by Academic Year and Grade Level

**What to build:** A staff-facing, read-only **Classes** area that lists every Section as a card, grouped by Academic Year and Grade Level, and opens a complete class record: roster, Homeroom Teacher, Teaching Assignments, Subjects with staffing status, weekly Timetable, Attendance, and Results. It is a live read model over existing records, not a new store.

**Blocked by:** none (01–36 complete)

**Status:** done

## Problem Statement

Staff cannot answer "what is this class actually like?" in one place. A Section's facts are scattered across Academic setup (identity, capacity, homeroom), Students (roster), Timetable (period grid, Lessons), Attendance (records and summaries), and Results (averages, Letter Grades). Only a Registrar with `academic.manage` can see most of it; the Principal cannot open Academic setup at all, and a Teacher has no section-level read view beyond the attendance sheet.

Worse, there is no way to browse classes as classes. The Sections tab is a flat table of one Academic Year, reachable only through an administrative screen, and it carries no attendance, staffing, or results context. A Principal, Accountant, or Librarian who asks "who is in 10-A, who teaches them, and how are they doing?" has to piece the answer together from screens they may not be allowed to open.

## Solution

Add a **Classes** destination for every Staff role. It shows one card per Section, grouped by Academic Year and Grade Level, with the facts needed to judge the class at a glance: class name, Grade Level, Homeroom Teacher, occupancy against capacity, Subject count, and Attendance rate. Cards warn when a class is at capacity, over capacity, or has Subjects without a Teaching Assignment.

Opening a card shows the complete class record in one page: roster with active and inactive Enrollments, Teachers grouped with their Subjects (Homeroom Teacher pinned), every curriculum Subject with its staffing status, the weekly Timetable grid, Attendance for a chosen day plus a Semester summary per Student, and the Section's published Results. The whole record prints as one document.

The area is read-only. Every correction still happens on the existing management screens, which remain unchanged.

## User Stories

1. As a Staff member, I want a **Classes** destination in the sidebar, so that I can reach class records without going through administrative setup.
2. As a Staff member, I want Classes grouped first by Academic Year and then by Grade Level, so that I can find a class the way I think about the school.
3. As a Staff member, I want the current Academic Year selected by default, so that the common case needs no filtering.
4. As a Staff member, I want a Year filter that includes an "all years" option, so that I can browse history deliberately.
5. As a Staff member, I want every Section to appear as a card rather than a table row, so that each class reads as a distinct object with its own facts.
6. As a Staff member, I want each card to show the class name, Grade Level, Academic Year, Homeroom Teacher, occupancy as active Students against capacity, Subject count, and Attendance rate, so that I can compare classes without opening them.
7. As a Staff member, I want cards ordered by Grade Level and then class name, so that scanning a long list is predictable.
8. As a Staff member, I want years ordered newest first when I choose "all years", so that recent classes come first.
9. As a Registrar, I want a card to say **At capacity** when active Enrollments equal capacity, so that I know the class is full.
10. As a Registrar, I want **Over capacity** shown only when legacy data exceeds capacity, so that the two states are not confused.
11. As a Registrar, I want the number of Subjects without a Teaching Assignment on the card, so that staffing gaps surface before the term starts.
12. As a Staff member, I want an empty state when a chosen Academic Year has no Sections, so that a blank page never looks broken.
13. As a Staff member, I want cards to be keyboard reachable and readable by a screen reader, so that the area meets the same accessibility bar as the rest of the application.
14. As a Staff member, I want to click a card to open that class record at its own address, so that I can bookmark or share the class I am looking at.
15. As a Staff member, I want a breadcrumb back to Classes, so that I can return without using the browser.
16. As a Staff member, I want the class record header to show the class name, Grade Level, Academic Year, Homeroom Teacher, and occupancy, so that I always know which class I am reading.
17. As a Staff member, I want a Year switcher on the class record that follows the same class name into another Academic Year, so that I can compare 10-A this year with 10-A last year.
18. As a Staff member, I want a clear **Not offered that year** state when the same class name does not exist in the chosen year, so that the switcher never dead-ends silently.
19. As a Staff member, I want the active roster with admission number and name, so that I can see who is actually in the class.
20. As a Staff member, I want inactive Enrollments behind a toggle, with their status and dates, so that transfers and withdrawals do not clutter the roster but remain discoverable.
21. As a Staff member, I want the roster to show active count against capacity, so that the header and the list agree.
22. As a Staff member, I want to open a Student's profile from the roster, so that I can go from class context to person context.
23. As a Staff member, I want a specific empty state when a Section has no active Students, so that I do not mistake an empty roster for a loading failure.
24. As a Staff member, I want Teachers grouped with the Subjects they teach, so that I can see each Teacher's load in this class.
25. As a Staff member, I want the Homeroom Teacher pinned at the top of the Teachers panel and badged, so that pastoral responsibility is unmistakable.
26. As a Staff member, I want the Subjects panel to list the full Grade Level curriculum, so that missing Subjects are visible rather than absent.
27. As a Staff member, I want each Subject marked with its Teacher or as **Unassigned**, so that staffing gaps are explicit.
28. As a Registrar, I want the Subjects panel to link to the Timetable and Teaching Assignments screens, so that I can fix a gap immediately.
29. As a Staff member, I want the weekly Timetable grid with Periods, Lessons, Subject, Teacher, and Room, so that I can see the class's week without leaving the record.
30. As a Staff member, I want the Timetable to respect the school's teaching days, so that the grid does not invent a weekend.
31. As a Staff member, I want a specific empty state when a Section has no Period grid, so that I know the timetable has not been configured.
32. As a Staff member, I want a specific empty state when a grid exists but has no Lessons, so that I know the grid is configured but unscheduled.
33. As a Staff member with attendance access, I want a day view of Attendance defaulting to a sensible date, so that opening the class shows today's reality.
34. As a Staff member, I want the day view to default to the most recent date with Attendance Records when today is not a teaching day in this Academic Year, so that a holiday does not produce a misleading empty roster.
35. As a Staff member, I want to pick any date and see each active Student's status and reason, so that I can audit a specific day.
36. As a Staff member, I want a Semester selector with the Semester containing the default date chosen first, so that the summary matches the day I am looking at.
37. As a Staff member, I want a per-Student Semester summary of present, absent, late, and excused counts with an attendance rate, so that I can identify patterns.
38. As a Staff member, I want Section-level Attendance totals and rate, so that I can judge the class as a whole.
39. As a Staff member, I want the Attendance panel to explain that my role cannot see attendance instead of showing zeros, so that missing permission is never mistaken for missing data.
40. As a Staff member, I want a true empty state when a Section has no Attendance Records in the selected Semester, so that `0%` is never shown for "not recorded".
41. As a Staff member, I want per-period Attendance handled consistently with the rest of the application, so that schools using per-period attendance see the same picture here.
42. As a Staff member with results access, I want class-level Results indicators — class average, pass rate, Students with failed Subjects, and Retention count, so that I can judge academic health at a glance.
43. As a Staff member, I want one row per Student with Overall Average, Letter Grade, failed Subject count, pass status, and Retention status, so that I can see who needs attention.
44. As a Staff member, I want each Student row to expand into per-Subject detail: First Exam, Final Exam, Supplementary Exam where present, Annual Subject Score, Letter Grade, and pass or fail, so that I can explain the summary.
45. As a Staff member, I want unpublished Exam Scores shown as **Pending** rather than zero, so that a missing publication is not read as a failing mark.
46. As a Staff member, I want a specific empty state when the Section has no published Results, so that absence of data is explicit.
47. As a Staff member without results access, I want the Results panel to say my role cannot see results instead of failing the page, so that the rest of the record remains usable.
48. As a Staff member, I want one **Print class profile** action that produces the school header, class identity, roster, Teachers and Subjects, weekly Timetable, Attendance summary, and Results summary, so that I can hand a complete class record to a colleague or file it.
49. As a Staff member, I want the printed sheet to hide the application shell and print only the document, so that the output is clean.
50. As a Dari or Pashto user, I want every Classes label translated, the page mirrored to RTL, dates in Solar Hijri, and numbers in Eastern digits, so that the area matches the rest of the product.
51. As a user in either theme, I want Classes to use the existing design tokens in light and dark mode, so that it does not look like a separate application.
52. As a Staff member, I want loading, error, and retry states on every panel, so that a slow or failed request never leaves a blank region.
53. As a Teacher, I want the Classes list to contain only Sections where I am Homeroom Teacher or hold a Teaching Assignment, so that I see my classes and not unrelated cohorts.
54. As a Teacher, I want a clear unavailable state when I open another Teacher's class address, so that the restriction is explained rather than looking broken.
55. As a Principal, I want to open every class record without any write capability, so that oversight does not require administrative rights.
56. As an Accountant or Librarian, I want the roster, Teachers, Subjects, and Timetable without Attendance or Results, so that I get what my role needs without acquiring grade-level access.
57. As a Student or Guardian, I want the Classes area to remain unavailable and my portal unchanged, so that I never see classmates' attendance or marks.
58. As a Staff member, I want the Classes area to show live data, so that a transfer or a moved Lesson appears the moment I reload, with no stale snapshot.

## Implementation Decisions

### Vocabulary and naming

- The UI destination is **Classes**; the model entity remains **Section**. The page subtitle explains that Classes are Sections grouped by Academic Year and Grade Level.
- `GLOSSARY.md` gains a **Classes** entry recording it as the staff-facing name for browsing Section records, explicitly not a new entity and not a Lesson. The Section entry keeps its existing definition.

### Access

- A new Permission `academic.view` ("View class records") is added to the seeded Permission catalog.
- `academic.view` is granted to Super Admin, Principal, Registrar, Teacher, Accountant, and Librarian. Student and Guardian do not receive it.
- The Classes routes and the SPA route require `academic.view`. The SPA sidebar filters the entry by the same slug.
- Teacher scoping is enforced in the controller, not only in the route: a Teacher may open a Section only when they are its Homeroom Teacher or hold a Teaching Assignment in it. The rule mirrors the existing attendance section-access check and should be extracted into one shared authorization helper rather than copied a third time.
- Non-owning Teachers receive `403` with a distinct message key; the SPA renders an unavailable state, not a generic error.
- Panel permissions stay independent: Attendance requires `attendance.view` and Results require `exams.view`. The server enforces both; the SPA also avoids requesting panels the signed-in Role cannot read.

### Data model

- No schema changes and no new tables. Class records are a live read model over Academic Years, Grade Levels, Sections, Enrollments, Staff, Subjects, Curriculum, Teaching Assignments, Periods, Lessons, Attendance Records, Exams, Exam Scores, and Supplementary Exams.
- No snapshots, no archival copy, and no denormalised class summary table.
- Attendance aggregation counts one status per Student per date: the daily Attendance Record when present, otherwise that date's per-period records collapsed by severity `absent`, `late`, `excused`, `present`. This keeps per-period schools correct and avoids double counting.
- An attendance rate is `(present + late) / total`, matching the existing summary formula, and is `null` when there are no records.
- A Subject is **Unassigned** for a Section when the curriculum includes it for that Academic Year and Grade Level but no Teaching Assignment links it to that Section.
- A Section's card Attendance rate covers all Attendance Records for that Section within its own Academic Year, capped at the end of that year for past years.

### API contracts

All responses keep the existing `{data}` envelope and snake_case field convention.

- **`GET /api/v1/classes?academicYearId=&allYears=1`** — Permission `academic.view`; Teacher-scoped. Returns the Academic Years available for the filter and one entry per Section with: identity, Grade Level number and names, Academic Year label and current-year flag, capacity, active and inactive Student counts, Homeroom Teacher id and name, Subject count, Unassigned Subject count, and Attendance rate. No pagination: the school has tens of Sections, not thousands. When `academicYearId` is omitted, the current Academic Year is used unless `allYears=1`.
- **`GET /api/v1/sections/{id}/profile`** — Permission `academic.view`; Teacher-scoped; `404` for an unknown Section. Returns:
  - the Section header with Grade Level and Academic Year labels and the Homeroom Teacher's name;
  - counts for active Students, inactive Students, capacity, Subjects, and Unassigned Subjects;
  - `siblings`: the same Grade Level and class name in other Academic Years, each with its Section id and Year label, used by the Year switcher;
  - the roster: active and inactive Enrollments with Student identity, Enrollment status, and started and ended dates;
  - Teachers grouped from Teaching Assignments, each with a Homeroom flag and the Subjects they teach in this Section;
  - the full curriculum with weekly Periods, elective flag, and assigned Teacher or null;
  - the Timetable grid in the same shape as the existing Section timetable read model, including Periods, Lessons keyed by Period and day, and the school's teaching days.
- **`GET /api/v1/sections/{id}/attendance?date=&semesterId=`** — Permission `academic.view` plus `attendance.view`; Teacher-scoped. Returns the resolved date, the Semesters for the Section's Academic Year, the selected Semester, the day roster with each active Student's status and reason, and the per-Student and Section-level Semester summary. When the requested date is not a teaching day inside the Academic Year, or has no records, the endpoint resolves the most recent date with records and reports which date it used; when the Semester has no records at all, counts stay zero and the rate is `null`.
- **`GET /api/v1/sections/{id}/results`** — unchanged and reused as-is. The Results panel calls it only when the viewer has `exams.view`. No ranking changes are introduced.
- **Pagination alias** — the shared pagination reader accepts `pageSize` as an alias of `perPage`, fixing the existing silent truncation at 25 or 50 rows. New frontend code uses `perPage`.

### Interface

- New SPA routes for the Classes list and a class record. The Sidebar places **Classes** directly under Dashboard.
- The Academy → Sections tab keeps its current behaviour and gains an **Open class record** row action that navigates to the class record. It remains the only editing surface for Sections.
- Class cards are real links, keyboard reachable, with the class name as their accessible label and the remaining facts as readable text. Warnings use text plus an icon, never colour alone.
- The class record is one page with a header and stacked panels rather than hidden tabs, so printing can emit everything. Students, Teachers, Subjects, Timetable, Attendance, and Results each render their own Panel with loading, error, and empty states.
- The Year switcher uses the `siblings` list; selecting a year with no sibling shows **Not offered that year** and keeps the current record visible.
- The roster links to the existing Students screen with the Student preselected, so the Student detail opens on arrival for Roles with `students.view`.
- **Print class profile** reuses the shared print-header, footer, print-button, and print-mode layer. It hides the application shell while the dialog is open and emits a sectioned sheet: header, identity, roster, Teachers and Subjects, Timetable, Attendance summary, and Results summary. The existing class-list print is untouched.
- A `classes.*` i18n namespace is added in English, Dari, and Pashto for every new label, empty state, warning, and print heading. No label is hardcoded; the i18n completeness check must report zero missing keys.
- Dates use the application's locale-aware formatter; Dari and Pashto produce Solar Hijri dates and Eastern digits, and the page mirrors to RTL with the existing logical-property styles.
- The page uses existing design tokens and primitives: Panel, StatCard, Badge, ProgressBar, EmptyState, DataTable, Tabs, Modal, and the shared formatter.

### Documentation

- `docs/specs/meridian-academy-v1.md` gains a **Classes read model** section describing the area, access rules, endpoints, and the live-data decision.
- `README.md` documents the Classes area, the new Permission, the need to re-run the Permission seeder on an existing database, and the sixth browser journey.
- The demo Seed is not rewritten. Existing seeded Sections, Enrollments, Lessons, Attendance, and published Results are enough to exercise the area; only the Permission matrix changes.

## Testing Decisions

A good test here asserts externally observable behaviour: the HTTP response for a given Role, Section, Year, date, and Semester; and what a person can see and click in a browser. Tests should not assert controller internals, SQL strings, or component structure.

Seams to use, both already present:

1. **HTTP API integration seam** — the existing suite boots the real PHP server against a temporary SQLite database seeded by the project Seed and calls endpoints with real sessions. This is the highest-value seam and covers access rules, shapes, year filtering, teacher scoping, and attendance resolution. Reuse it; add no new harness.
2. **Critical browser journey seam** — the existing Playwright suite drives the real SPA against the real API. Add one journey for Classes: open it from the sidebar, see grouped cards, open a class, read roster, Teachers, Subjects, Timetable, Attendance, and Results, and verify the print sheet. The same journey, or a short addition, verifies a Teacher sees only their own class and a Student cannot reach the area. Keep the suite serial and rebuild the test database first, as today.

No new seams are needed. No unit-test seam is introduced, because the interesting rules are permission, scoping, aggregation, and rendering behaviour that the two existing seams already exercise end to end.

Coverage expected at the API seam:

- `academic.view` holders in each Staff Role can list Classes; Student and Guardian receive `403`.
- A Teacher's list contains only homeroom and assigned Sections; opening another Section returns `403`.
- The list defaults to the current Academic Year, filters by an explicit year, and returns all years when asked.
- Card counts match the Seed: active and inactive Enrollments, capacity, Subject count, and Unassigned Subject count.
- A class with a fully staffed curriculum reports zero Unassigned; a deliberately removed Teaching Assignment reports one.
- Attendance rate is `null` with no records and numeric with records.
- The profile returns the roster split, grouped Teachers with the Homeroom Teacher flagged, every curriculum Subject, and a Timetable grid consistent with the existing timetable read model.
- The Year switcher returns siblings for the same Grade Level and class name and omits years where the class does not exist.
- Attendance defaults to the most recent date with records when today is not a teaching day or has none, honours an explicit date and Semester, and returns zero counts with a `null` rate for an empty Semester.
- Per-period Attendance collapses to one status per Student per date without double counting.
- Results reuse the existing Section results endpoint, return pending unpublished scores, and remain forbidden to Roles without `exams.view`.
- `pageSize` and `perPage` return the same page size.

## Out of Scope

- Creating, editing, deleting, or archiving Sections from Classes.
- Adding or removing Students, transferring Enrollments, or editing Attendance from Classes.
- Teaching Assignment, Lesson, Period grid, Exam, Exam Score, or Supplementary Exam editing from Classes.
- Report Cards, finance, library, admissions, announcements, and audit inside Classes.
- Ranking changes or new Results arithmetic.
- Semester-scoped Teaching Assignments, a Room assigned to a Section, or section-level Attendance locks.
- Snapshots, frozen end-of-year class records, or any new persistence.
- Student and Guardian access to Classes.
- Pagination, virtualisation, or search for very large Section counts.
- New dependencies.

## Further Notes

- This is a read-only capability added on top of the shipped v1; it must not change any existing endpoint's behaviour except the pagination alias.
- The Principal gaining `academic.view` does not grant any write permission; `academic.manage` remains with Super Admin and Registrar.
- Re-seeding is required on an existing database because Permissions are seeded, not migrated. The setup and README instructions must say so.
- The existing Sections tab and the new Classes area answer different questions: one edits structure, the other reports on a class. Keep both.
- Print must not regress the existing print surfaces; re-run the print journey after adding the class profile sheet.
- Local date handling stays ISO and Gregorian in storage; Solar Hijri and Eastern digits are presentation only.

## Acceptance Criteria

- [x] A Staff member with `academic.view` sees **Classes** in the sidebar under Dashboard and can open the area.
- [x] Cards are grouped by Academic Year and Grade Level, default to the current year, and support a year filter and "all years".
- [x] Card facts include class name, Grade Level, Academic Year, Homeroom Teacher, occupancy, Subject count, and Attendance rate, with At capacity, Over capacity, and Unassigned Subject states.
- [x] A class record shows roster with inactive toggle, grouped Teachers with Homeroom pinned, curriculum with Unassigned flags, weekly Timetable, day and Semester Attendance, and published Results with expandable Subject detail.
- [x] The Year switcher follows the class name across Academic Years and shows **Not offered that year** when absent.
- [x] Attendance defaults to the most recent recorded date when today is not usable, and empty data shows an empty state rather than `0%`.
- [x] Results and Attendance panels degrade with a permission message for Roles lacking `exams.view` or `attendance.view`.
- [x] A Teacher sees and opens only their own Sections; Student and Guardian cannot reach the area; Principal, Accountant, and Librarian see what their Permissions allow.
- [x] Print class profile emits one clean sheet with header, roster, Teachers and Subjects, Timetable, Attendance, and Results.
- [x] English, Dari, and Pashto cover every label, including RTL, Solar Hijri dates, and Eastern digits; the i18n check reports zero missing keys.
- [x] API integration tests and the Playwright suite pass, including the new Classes journey and the existing print journey.
- [x] README, the v1 spec, and the Glossary are updated; no existing endpoint changes beyond the `pageSize` alias.

## Comments

- Delivered as child tickets 38–44, all closed: list cards, class record and roster, Teachers/Subjects/Timetable, Attendance, Results, print profile, and acceptance.
- Commits: `be05d2c` (38), `f6c8339` (39), `1a7846d` (40), `c878889` (41), `a92e12f` (42), `12f42c1` (43), `c70350d` (44).
- Final gates: PHP lint 60 files, API suite 29/29, i18n TOTAL 0, production build succeeded, Playwright 6/6 including the new Classes journey and every print surface.
- No schema changes and no new tables; Classes is a live read model over Sections. The only change to an existing contract is the `pageSize` alias for `perPage`.
