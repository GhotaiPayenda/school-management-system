# 21: Payments, Receipts, and Student ledger

**What to build:** An Accountant records partial or full Payments by cash, bank transfer, or mobile money; each Payment produces a numbered, printable Receipt; duplicate submissions are prevented; and a Student ledger shows the full financial relationship.

**Blocked by:** 20 (Monthly Invoice generation)

**Status:** done

- [x] An Accountant can record a Payment against an issued Invoice for less than, equal to, or more than the balance.
- [x] A Payment records amount, method, date, recorder, and an idempotency key, and a retried request does not create a second Payment.
- [x] Partial Payments update the Invoice to partially paid, and full settlement updates it to paid.
- [x] Each successful Payment receives a sequential Receipt number, and a localized Receipt print view shows school identity, Student, Invoice, amount, method, date, and recorder.
- [x] The Student ledger lists Invoices, Payments, Receipts, and current balance in date order.
- [x] Payment recording and Receipt generation create Audit Entries.
- [x] API and browser tests cover partial and full Payments, overpayment, idempotency, Receipt numbering and print, ledger totals, audit, and permission denial.

## Comments

- Partial, full, and over-payments are supported with method, date, recorder, and `Idempotency-Key` enforcement; retries replay instead of duplicating.
- Sequential receipt numbers and a localized printable receipt (school identity, student, invoice, amount, method, date, recorder, balance after) are implemented.
- The student ledger lists invoices, payments, receipts, and balances; payment and receipt actions create Audit Entries. The print browser journey opens the receipt.
