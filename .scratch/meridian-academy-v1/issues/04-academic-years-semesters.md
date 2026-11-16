# 04: Academic years and semesters

**What to build:** A Registrar creates an Academic Year, defines exactly two Semesters with date ranges, marks the current year, and receives validation when dates overlap or fall outside the year.

**Blocked by:** 03 (School identity and settings)

**Status:** done

- [x] A Registrar can create, edit, and list Academic Years with a label, start date, and end date.
- [x] Exactly one Academic Year can be marked current, and switching the current year updates the active context.
- [x] Each Academic Year has exactly two Semesters with names and date ranges inside the year.
- [x] Overlapping Semesters, dates outside the Academic Year, and a second current year are rejected with field-level errors.
- [x] API and browser tests cover valid and invalid date ranges, the two-Semester rule, and switching the current year.

## Comments

- `AcademicController` implements Academic Year and Semester CRUD, exactly one current year, and the two-semester rule with date-range validation.
- `AcademicPage` provides year and semester lists and editing; switching the current year refreshes the shared `ReferenceProvider` context.
- Covered by the HTTP API suite and the admin module journey.
