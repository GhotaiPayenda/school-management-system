# 23: Refunds, credits, and arrears

**What to build:** An Accountant records audited Refunds against Payments, holds overpayment as Credit and applies it to the next Invoice, and works an Arrears report of past-due balances by Grade Level and Section.

**Blocked by:** 22 (Discounts and manual charges)

**Status:** done

- [x] A Refund references an existing Payment, requires a reason, cannot exceed the remaining refundable amount, and creates an Audit Entry.
- [x] A Refund updates the Student ledger and the affected Invoice balance without deleting the original Payment.
- [x] Overpayment becomes a Credit balance, and Credit can be applied to the next issued Invoice.
- [x] The Arrears report lists only issued Invoices past their due date with a positive balance, grouped by Grade Level and Section.
- [x] Arrears totals reconcile with the Student ledger and the finance dashboard.
- [x] API and browser tests cover refund limits, ledger effects, credit application, arrears filtering and totals, and permission denial.

## Comments

- Refunds reference a payment, require a reason, respect the remaining refundable amount, update the ledger and invoice balance, preserve the original payment, and create an Audit Entry.
- Overpayments become credits applicable to the next issued invoice; arrears list only issued, past-due, positive-balance invoices grouped by grade and section.
- `FinancePage` provides refund, credit, and arrears views.
