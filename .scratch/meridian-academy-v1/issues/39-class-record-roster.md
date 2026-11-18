# 39: Class record — header, year switcher, and roster

**What to build:** Clicking a class card opens that Section's record at its own address. The header shows class identity, Grade Level, Academic Year, Homeroom Teacher, and occupancy against capacity. A Year switcher follows the same class name into another Academic Year and shows **Not offered that year** when it does not exist. The roster lists active Enrollments with admission number and name, hides inactive Enrollments behind a toggle that shows status and dates, shows the active count against capacity, and opens a Student's profile. A Teacher who does not own the Section sees a clear unavailable state.

**Blocked by:** 38 (Classes list with cards, grouping, and year filter)

**Status:** done

- [x] `GET /sections/{id}/profile` returns the Section header with Grade Level and Academic Year labels and Homeroom Teacher name, active and inactive Student counts, capacity, Subject counts, sibling Sections for the same Grade Level and class name in other years, and the roster of Enrollments with Student identity, Enrollment status, and started and ended dates.
- [x] An unknown Section returns `404`; a Teacher who is neither Homeroom Teacher nor holds a Teaching Assignment returns `403` with a distinct message key; the SPA renders an unavailable state rather than a generic error.
- [x] `/classes/:id` opens from a card, shows a breadcrumb back to Classes, and renders the header facts and the Year switcher.
- [x] The Year switcher moves to the sibling Section for the chosen year and shows **Not offered that year** when no sibling exists, without losing the current record.
- [x] The roster defaults to active Enrollments, exposes an inactive toggle with status and dates, and displays the count against capacity consistently with the header.
- [x] Roster rows open the Student profile on the existing Students screen with that Student preselected for Roles holding `students.view`.
- [x] Empty states distinguish "no active Students" from loading failure; the page and panels expose loading, error, and retry states.
- [x] API tests cover the profile shape, `404`, Teacher `403`, sibling years, the active and inactive split, and counts; the browser journey asserts the header, switcher, and roster.
- [x] All new labels exist in English, Dari, and Pashto, with RTL, Eastern digits, and Solar Hijri dates; the i18n completeness check reports zero missing keys.

## Comments

- `GET /sections/{id}/profile` returns the header, counts, siblings, and roster with the shared Teacher scoping rule.
- `/classes/:id` adds the breadcrumb, Year switcher with the Not offered state, active/inactive roster tabs, and Student-profile preselection through `/students?studentId=`.
- 4 API tests cover the profile, siblings, Teacher 403, portal denial, and 404; the admin journey asserts the header, switcher, and roster.
