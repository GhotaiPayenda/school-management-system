# 10: Students, Guardians, and documents

**What to build:** A Registrar registers Students with admission numbers, photos, and documents; records multiple Guardians with exactly one primary contact; links siblings; searches the roster; and opens a Student profile that will later aggregate enrollment, attendance, results, fees, and library history.

**Blocked by:** 02 (Design system and trilingual RTL shell)

**Status:** done

- [x] A Registrar can create, edit, archive, and search Students with a unique admission number, personal details, photo, and optional documents.
- [x] Admission numbers are generated automatically in a configurable format, with a manual override that still enforces uniqueness.
- [x] A Registrar can add multiple Guardians to a Student with a relationship and contact details, and exactly one Guardian is primary.
- [x] Siblings can be linked, and each linked Student shows the relationship.
- [x] The Student profile shows identity, Guardians, siblings, documents, and status, with placeholders for enrollment, attendance, results, invoices, and Loans as those modules arrive.
- [x] API and browser tests cover duplicate admission numbers, the one-primary-Guardian constraint, sibling links, document upload, search, and permission denial.

## Comments

- `PeopleController` implements Student CRUD, generated admission numbers with manual override, guardians with one primary, siblings, documents, and profile history.
- `StudentsPage` provides the list, filters, profile tabs, guardian/sibling linking, document upload, and portal account creation.
- API tests cover the people surface and role isolation; the print browser journey also exercises student detail loading.
