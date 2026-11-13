# 23: Refunds, credits, and arrears

**What to build:** An Accountant records audited Refunds against Payments, holds overpayment as Credit and applies it to the next Invoice, and works an Arrears report of past-due balances by Grade Level and Section.

**Blocked by:** 22 (Discounts and manual charges)

**Status:** ready-for-agent

- [ ] A Refund references an existing Payment, requires a reason, cannot exceed the remaining refundable amount, and creates an Audit Entry.
- [ ] A Refund updates the Student ledger and the affected Invoice balance without deleting the original Payment.
- [ ] Overpayment becomes a Credit balance, and Credit can be applied to the next issued Invoice.
- [ ] The Arrears report lists only issued Invoices past their due date with a positive balance, grouped by Grade Level and Section.
- [ ] Arrears totals reconcile with the Student ledger and the finance dashboard.
- [ ] API and browser tests cover refund limits, ledger effects, credit application, arrears filtering and totals, and permission denial.