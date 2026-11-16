# 31: Guardian portal

**What to build:** A Guardian signs in, switches between linked children, and sees each child's attendance, results, published Report Cards, Invoices, outstanding balance, library Loans, and targeted Announcements. The portal is read-only and has no online payment.

**Blocked by:** 10 (Students, Guardians, and documents), 13 (Daily attendance), 18 (Semester and Annual Report Cards), 20 (Monthly Invoice generation), 26 (Library loans, returns, and renewals), 28 (Announcements and targeting)

**Status:** done

- [x] A Guardian sees only linked children and can switch the active child without reloading the whole application.
- [x] For each child, the Guardian sees attendance, results, published Report Cards, Invoices, Payments, outstanding balance, and library Loans.
- [x] The Guardian can print a child's published Report Card but cannot edit grades, attendance, or financial records.
- [x] Announcements are filtered to the Guardian Role and the children's Grade Levels and Sections.
- [x] A Guardian cannot access another family's child through the API or by changing an identifier.
- [x] API and browser tests cover child isolation, switching, read-only behavior, invoice visibility, print, and permission denial.

## Comments

- The guardian portal exposes only linked children, with child switching, attendance, results, published report cards, invoices, payments, outstanding balance, and library loans.
- Guardians are read-only for grades, attendance, and finance; controller ownership checks block other families, and staff routes return 403.
- The Guardian Playwright journey verifies family navigation, isolation, and report-card access.
