# 10: Students, Guardians, and documents

**What to build:** A Registrar registers Students with admission numbers, photos, and documents; records multiple Guardians with exactly one primary contact; links siblings; searches the roster; and opens a Student profile that will later aggregate enrollment, attendance, results, fees, and library history.

**Blocked by:** 02 (Design system and trilingual RTL shell)

**Status:** ready-for-agent

- [ ] A Registrar can create, edit, archive, and search Students with a unique admission number, personal details, photo, and optional documents.
- [ ] Admission numbers are generated automatically in a configurable format, with a manual override that still enforces uniqueness.
- [ ] A Registrar can add multiple Guardians to a Student with a relationship and contact details, and exactly one Guardian is primary.
- [ ] Siblings can be linked, and each linked Student shows the relationship.
- [ ] The Student profile shows identity, Guardians, siblings, documents, and status, with placeholders for enrollment, attendance, results, invoices, and Loans as those modules arrive.
- [ ] API and browser tests cover duplicate admission numbers, the one-primary-Guardian constraint, sibling links, document upload, search, and permission denial.