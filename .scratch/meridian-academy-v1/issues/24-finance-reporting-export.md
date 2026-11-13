# 24: Finance reporting and export

**What to build:** An Accountant sees expected versus collected for a Billing Period, collection broken down by Grade Level and Section, and exports finance data to CSV with localized headers and formula-injection protection.

**Blocked by:** 23 (Refunds, credits, and arrears)

**Status:** ready-for-agent

- [ ] A monthly summary shows total invoiced, total collected, total outstanding, discounts, refunds, and credits for the selected Billing Period.
- [ ] Collection is broken down by Grade Level and Section, and the totals reconcile with Invoice and Payment records.
- [ ] The report supports date and Billing Period filters and paginated detail.
- [ ] CSV export includes localized headers, respects the active filters, and escapes leading formula characters.
- [ ] Only finance-authorized Roles can view or export the report.
- [ ] API and browser tests cover totals, reconciliation, filters, CSV content, formula protection, and permission denial.