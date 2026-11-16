# 24: Finance reporting and export

**What to build:** An Accountant sees expected versus collected for a Billing Period, collection broken down by Grade Level and Section, and exports finance data to CSV with localized headers and formula-injection protection.

**Blocked by:** 23 (Refunds, credits, and arrears)

**Status:** done

- [x] A monthly summary shows total invoiced, total collected, total outstanding, discounts, refunds, and credits for the selected Billing Period.
- [x] Collection is broken down by Grade Level and Section, and the totals reconcile with Invoice and Payment records.
- [x] The report supports date and Billing Period filters and paginated detail.
- [x] CSV export includes localized headers, respects the active filters, and escapes leading formula characters.
- [x] Only finance-authorized Roles can view or export the report.
- [x] API and browser tests cover totals, reconciliation, filters, CSV content, formula protection, and permission denial.

## Comments

- `FinanceController::summary` reports invoiced, collected, outstanding, discounts, refunds, credits, payment count, daily collections, and method/grade/section breakdowns for the selected range.
- Filters cover date and billing period; invoice and payment CSV exports use localized headers, current filters, and formula-injection protection.
- Finance routes require `finance.view`/`finance.manage`, with role-isolation tests.
