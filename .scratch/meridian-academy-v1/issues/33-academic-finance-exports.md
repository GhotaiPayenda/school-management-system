# 33: Academic and finance exports

**What to build:** A Registrar and an Accountant export attendance, exam scores, and finance data to CSV with localized headers, active filters, and formula-injection protection.

**Blocked by:** 13 (Daily attendance), 17 (Results, rankings, and Supplementary Exams), 24 (Finance reporting and export)

**Status:** ready-for-agent

- [ ] Attendance can be exported for a Section and date range, including Student, date, status, and reason.
- [ ] Exam scores can be exported for an Exam and Section, including First Exam, Final Exam, Annual Subject Score, and pass/fail.
- [ ] Finance data can be exported for a Billing Period, including Invoice, Student, amount, paid, balance, and status.
- [ ] Headers and status labels are localized to the active language, and leading formula characters are escaped.
- [ ] Large exports are generated in batches or streamed so the request does not time out.
- [ ] Only Roles with the relevant permission can export each dataset.
- [ ] API tests verify content, totals, localization, formula protection, and permission denial.