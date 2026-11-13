# 20: Monthly Invoice generation

**What to build:** An Accountant previews and issues monthly Invoices for active Students from the Grade Level Fee Structure, with sequential numbering, due dates, statuses, and a view of Students who have not been invoiced for a Billing Period.

**Blocked by:** 11 (Admissions and Enrollment), 19 (Fee structures)

**Status:** ready-for-agent

- [ ] An Accountant can generate draft Invoices for a Billing Period for all active Enrollments, using the Grade Level's active Fee Structure.
- [ ] Draft generation is idempotent: generating again does not create a second Invoice for the same Student and Billing Period.
- [ ] A preview shows each Student's Fee Components, discounts if present, total, and due date before issue.
- [ ] Issuing assigns a sequential Invoice number, sets the due date to the configured day, and moves the Invoice to issued status.
- [ ] The admission fee appears on the first Invoice, and the exam fee appears on the first Invoice of the relevant Semester.
- [ ] A never-invoiced view lists active Students without an Invoice for the selected Billing Period.
- [ ] Invoice lists support filtering by Billing Period, Grade Level, Section, and status.
- [ ] API and browser tests cover generation, idempotency, preview totals, numbering, due dates, component placement, never-invoiced, and permission denial.