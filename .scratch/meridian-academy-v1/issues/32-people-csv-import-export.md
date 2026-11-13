# 32: People CSV import and export

**What to build:** A Registrar downloads CSV templates, dry-runs imports for Students, Guardians, and Staff, sees row-level validation errors, commits only valid data, and exports the same lists.

**Blocked by:** 07 (Staff records, teacher accounts, and Homeroom assignment), 10 (Students, Guardians, and documents)

**Status:** ready-for-agent

- [ ] A Registrar can download templates for Students, Guardians, and Staff with the expected columns and example rows.
- [ ] An upload dry run reports row-level errors for missing fields, invalid dates, duplicate admission or employee numbers, and unknown references without writing anything.
- [ ] A commit imports valid rows, skips or reports invalid rows according to the chosen mode, and never leaves a partial import hidden from the user.
- [ ] Imported Students and Staff appear in the normal lists and profiles, and imported Guardians are linked to the correct Students.
- [ ] Exports include the current filters, localized headers, and formula-injection protection.
- [ ] API and browser tests cover template download, dry-run errors, commit, duplicate rejection, export content, and permission denial.