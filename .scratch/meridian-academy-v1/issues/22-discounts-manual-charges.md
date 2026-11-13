# 22: Discounts and manual charges

**What to build:** An Accountant applies percentage or fixed Discounts for scholarships, siblings, and staff, adds manual charges with a reason, and every financial adjustment is audited.

**Blocked by:** 21 (Payments, Receipts, and Student ledger)

**Status:** ready-for-agent

- [ ] An Accountant can apply a percentage or fixed Discount to a Student's Invoice, and the total and balance recalculate correctly.
- [ ] Discounts carry a type such as scholarship, sibling, or staff, plus an optional note.
- [ ] A Discount applied to a draft Invoice updates the draft; a Discount applied to an issued Invoice creates an audited adjustment without rewriting the issued snapshot.
- [ ] An Accountant can add a manual charge with a description, amount, and reason, and it appears as a separate Invoice item.
- [ ] Discounts and manual charges require finance permission and create Audit Entries.
- [ ] API and browser tests cover percentage and fixed math, draft versus issued behavior, manual charges, audit, and permission denial.