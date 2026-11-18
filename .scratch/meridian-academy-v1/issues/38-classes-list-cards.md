# 38: Classes list with cards, grouping, and year filter

**What to build:** A Staff member with the new `academic.view` Permission opens **Classes** from the sidebar and browses every Section as a card, grouped by Academic Year and then Grade Level. The current Academic Year is selected by default; a year filter includes an "all years" option. Each card shows the class name, Grade Level, Academic Year, Homeroom Teacher, occupancy against capacity, Subject count, and Attendance rate, and warns when the class is at capacity, over capacity, or has Subjects without a Teaching Assignment. The list is a live read model, Teacher-scoped, and unavailable to Student and Guardian.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `academic.view` is seeded and granted to Super Admin, Principal, Registrar, Teacher, Accountant, and Librarian; Student and Guardian do not receive it, and every other Permission assignment is unchanged.
- [x] **Classes** appears in the sidebar directly under Dashboard for Roles holding `academic.view`, is translated in English, Dari, and Pashto, and is absent for Student and Guardian.
- [x] `GET /classes` returns one entry per Section with identity, Grade Level names, Academic Year label and current flag, capacity, active and inactive Student counts, Homeroom Teacher, Subject count, Unassigned Subject count, and Attendance rate, using the existing response envelope.
- [x] The endpoint defaults to the current Academic Year, honours an explicit Academic Year, and returns every year when asked; years sort newest first, Grade Levels ascending, class names ascending.
- [x] A Teacher's list contains only Sections where they are Homeroom Teacher or hold a Teaching Assignment; another Teacher's Section is refused by the profile route.
- [x] Cards show the seven facts, an At capacity state at equality, Over capacity only above capacity, and an Unassigned Subject count; warnings use text plus an icon, never colour alone.
- [x] A year with no Sections shows the Classes empty state, and the page has loading, error, and retry states.
- [x] The shared Section access rule is extracted into one helper and used by Attendance and Classes rather than copied again.
- [x] The shared pagination reader accepts `pageSize` as an alias of `perPage`, and a test proves both produce the same page.
- [x] `GLOSSARY.md` records **Classes** as the staff-facing name for browsing Section records, explicitly not a new entity and not a Lesson.
- [x] API tests cover the Role matrix, Teacher scoping, year filtering, card counts, warnings, ordering, and the pagination alias; the browser suite asserts the sidebar entry and grouped cards.
- [x] Dari and Pashto render the page RTL with Eastern digits and Solar Hijri year labels; no Classes label is hardcoded, and the i18n completeness check reports zero missing keys.

## Comments

- `academic.view` is seeded for the six Staff Roles; `GET /classes` backs the card grid with grouping, year filtering, capacity states, staffing gaps, and Attendance rate.
- The shared `SectionAccess` rule now serves both Attendance and Classes; `pageSize` is accepted as an alias of `perPage`.
- The `/classes` sidebar page, trilingual labels, Glossary entry, 6 API tests, and the admin-journey card assertions are in place.
