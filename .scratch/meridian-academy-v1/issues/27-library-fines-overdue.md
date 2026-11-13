# 27: Library fines, lost Copies, and overdue handling

**What to build:** A Librarian calculates per-day Fines capped at replacement cost, records lost or damaged Copies, works an overdue list, and optionally pushes a Fine to the Student's next Invoice.

**Blocked by:** 21 (Payments, Receipts, and Student ledger), 26 (Library loans, returns, and renewals)

**Status:** ready-for-agent

- [ ] Late return Fines equal days late × the configured daily rate, capped at the Copy's replacement cost.
- [ ] A lost or damaged Copy records the condition, changes the Copy status, and charges replacement cost plus the configured processing fee.
- [ ] The overdue list shows borrower, Title, Copy, due date, days late, and estimated Fine, with filtering and pagination.
- [ ] A Fine can be pushed to the Student's next Invoice exactly once, and the Library record shows that it was transferred.
- [ ] Fine settlement is visible in the Loan and borrower history and creates an Audit Entry.
- [ ] API and browser tests cover daily Fine math, the cap, lost and damaged charges, overdue data, one-time Invoice transfer, audit, and permission denial.