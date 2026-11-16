# 32: People CSV import and export

**What to build:** A Registrar downloads CSV templates, dry-runs imports for Students, Guardians, and Staff, sees row-level validation errors, commits only valid data, and exports the same lists.

**Blocked by:** 07 (Staff records, teacher accounts, and Homeroom assignment), 10 (Students, Guardians, and documents)

**Status:** done

- [x] A Registrar can download templates for Students, Guardians, and Staff with the expected columns and example rows.
- [x] An upload dry run reports row-level errors for missing fields, invalid dates, duplicate admission or employee numbers, and unknown references without writing anything.
- [x] A commit imports valid rows, skips or reports invalid rows according to the chosen mode, and never leaves a partial import hidden from the user.
- [x] Imported Students and Staff appear in the normal lists and profiles, and imported Guardians are linked to the correct Students.
- [x] Exports include the current filters, localized headers, and formula-injection protection.
- [x] API and browser tests cover template download, dry-run errors, commit, duplicate rejection, export content, and permission denial.

## Comments

- Student, guardian, and staff templates, dry-run validation, commit with row-level reporting, duplicate admission/employee checks, and guardian linking are implemented through `Csv` and `PeopleController`.
- Exports respect current filters, use localized headers, and escape formula-leading characters.
- `StudentsPage` and `StaffPage` expose import/export controls; the API suite exercises the people surface.
