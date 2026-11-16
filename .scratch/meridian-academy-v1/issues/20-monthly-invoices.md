# 20: Monthly Invoice generation

**What to build:** An Accountant previews and issues monthly Invoices for active Students from the Grade Level Fee Structure, with sequential numbering, due dates, statuses, and a view of Students who have not been invoiced for a Billing Period.

**Blocked by:** 11 (Admissions and Enrollment), 19 (Fee structures)

**Status:** done

- [x] An Accountant can generate draft Invoices for a Billing Period for all active Enrollments, using the Grade Level's active Fee Structure.
- [x] Draft generation is idempotent: generating again does not create a second Invoice for the same Student and Billing Period.
- [x] A preview shows each Student's Fee Components, discounts if present, total, and due date before issue.
- [x] Issuing assigns a sequential Invoice number, sets the due date to the configured day, and moves the Invoice to issued status.
- [x] The admission fee appears on the first Invoice, and the exam fee appears on the first Invoice of the relevant Semester.
- [x] A never-invoiced view lists active Students without an Invoice for the selected Billing Period.
- [x] Invoice lists support filtering by Billing Period, Grade Level, Section, and status.
- [x] API and browser tests cover generation, idempotency, preview totals, numbering, due dates, component placement, never-invoiced, and permission denial.

## Comments

- Invoice generation is idempotent per student/billing period, previews components and due dates, assigns sequential numbers on issue, and places admission and semester exam fees on the correct first invoice.
- Invoice lists filter by billing period, grade, section, and status, and a never-invoiced view lists missing active students.
- `FinancePage` exposes generation, preview, issue, and never-invoiced views.
