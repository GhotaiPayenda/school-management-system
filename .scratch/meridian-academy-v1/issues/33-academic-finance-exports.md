# 33: Academic and finance exports

**What to build:** A Registrar and an Accountant export attendance, exam scores, and finance data to CSV with localized headers, active filters, and formula-injection protection.

**Blocked by:** 13 (Daily attendance), 17 (Results, rankings, and Supplementary Exams), 24 (Finance reporting and export)

**Status:** done

- [x] Attendance can be exported for a Section and date range, including Student, date, status, and reason.
- [x] Exam scores can be exported for an Exam and Section, including First Exam, Final Exam, Annual Subject Score, and pass/fail.
- [x] Finance data can be exported for a Billing Period, including Invoice, Student, amount, paid, balance, and status.
- [x] Headers and status labels are localized to the active language, and leading formula characters are escaped.
- [x] Large exports are generated in batches or streamed so the request does not time out.
- [x] Only Roles with the relevant permission can export each dataset.
- [x] API tests verify content, totals, localization, formula protection, and permission denial.

## Comments

- Attendance, exam-score, invoice, and payment CSV exports are implemented with localized headers, active filters, formula protection, and permission checks.
- Exports stream through the CSV helper and include the expected student/date/status/reason, exam score/pass-fail, and invoice/paid/balance fields.
- The admin module journey opens each exporting screen without errors.
