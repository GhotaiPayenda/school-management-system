# 19: Fee structures

**What to build:** An Accountant defines per-Grade-Level Fee Structures for an Academic Year, with monthly recurring, one-time, and per-Semester Fee Components, translated names, and amounts that later invoices snapshot.

**Blocked by:** 04 (Academic years and semesters), 05 (Grade Levels, Sections, and Rooms)

**Status:** done

- [x] An Accountant can create one Fee Structure per Grade Level and Academic Year, with a status of draft or active.
- [x] Fee Components can be monthly recurring, one-time, or per-Semester, each with an amount and English, Dari, and Pashto labels.
- [x] Duplicate Fee Components of the same kind and name within a Fee Structure are rejected.
- [x] Admission is configurable as a one-time component, and exam fees can be attached to each Semester.
- [x] Editing a Fee Structure does not change any Invoice already issued.
- [x] The Fee Structure view is searchable by Grade Level and Academic Year, and only finance-authorized Roles can edit it.
- [x] API and browser tests cover component kinds, duplicate rejection, translation labels, editing isolation, and permission denial.

## Comments

- `FinanceController` implements one fee structure per grade/year, monthly/one-time/per-semester components, translated labels, duplicate rejection, draft/active status, and edit isolation from issued invoices.
- `FinancePage` provides the fee-structure builder and grade/year search.
- Finance permissions are enforced by route middleware and role isolation tests.
