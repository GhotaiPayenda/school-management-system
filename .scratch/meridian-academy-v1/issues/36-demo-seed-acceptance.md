# 36: Demo seed, README, and acceptance pass

**What to build:** A fresh checkout can seed a complete demo school, sign in as every Role, and pass the full API and critical browser suites in English, Dari, and Pashto, including print and RTL. The README covers setup, seeding, default logins, backups, locale switching, and tests.

**Blocked by:** 29 (Admin and Teacher dashboards), 30 (Student portal), 31 (Guardian portal), 32 (People CSV import and export), 33 (Academic and finance exports), 34 (Audit log), 35 (Backup, restore, and health check)

**Status:** done

- [x] A fresh setup command creates the database, runs migrations, and seeds 12 Grade Levels, two Sections per grade, Afghan names, standard subjects, demo Users for every Role, attendance, exams, scores, Invoices, Payments, and library Loans.
- [x] Every demo Role can sign in with documented credentials and reach its intended dashboard and navigation.
- [x] The README documents XAMPP and `php -S` setup, seeding, default logins, backup and restore, locale switching, and test commands.
- [x] The API integration suite and the critical browser suite pass in English, Dari, and Pashto.
- [x] Print and RTL checks pass for Report Cards, Receipts, timetables, ID cards, and class lists.
- [x] No out-of-scope feature is present, and every earlier ticket's acceptance criteria pass together.

## Comments

- `database/seeders/004_demo_school.php` seeds 12 grades, two sections per grade, Afghan names, 144 students, 14 staff, subjects/curriculum, periods, assignments, a Grade 1A timetable, holidays, attendance, exams/scores, supplementary examples, published report cards, fee structures, invoices, payments, library loans/fines, announcements, applicants, and audit entries.
- Eight documented demo accounts cover every role with `Meridian@2026`; the demo academic year is generated relative to the current date while keeping the March-January shape.
- `README.md` documents setup, seeding, demo logins, production serving, configuration, languages/calendars/themes, backups/restore, and all quality gates; `web/e2e/README.md` documents the browser suite.
- Final gates: `php scripts/lint-php.php` passes 56 files, `npm run test:api` passes 13/13, the production build succeeds, and the 5-journey Playwright suite passes in English plus RTL/Dari/Pashto checks. Print coverage includes report cards, receipts, timetables, exam schedules, ID cards, and class lists.
