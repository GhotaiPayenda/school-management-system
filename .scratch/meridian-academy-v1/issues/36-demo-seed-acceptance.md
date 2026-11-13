# 36: Demo seed, README, and acceptance pass

**What to build:** A fresh checkout can seed a complete demo school, sign in as every Role, and pass the full API and critical browser suites in English, Dari, and Pashto, including print and RTL. The README covers setup, seeding, default logins, backups, locale switching, and tests.

**Blocked by:** 29 (Admin and Teacher dashboards), 30 (Student portal), 31 (Guardian portal), 32 (People CSV import and export), 33 (Academic and finance exports), 34 (Audit log), 35 (Backup, restore, and health check)

**Status:** ready-for-agent

- [ ] A fresh setup command creates the database, runs migrations, and seeds 12 Grade Levels, two Sections per grade, Afghan names, standard subjects, demo Users for every Role, attendance, exams, scores, Invoices, Payments, and library Loans.
- [ ] Every demo Role can sign in with documented credentials and reach its intended dashboard and navigation.
- [ ] The README documents XAMPP and `php -S` setup, seeding, default logins, backup and restore, locale switching, and test commands.
- [ ] The API integration suite and the critical browser suite pass in English, Dari, and Pashto.
- [ ] Print and RTL checks pass for Report Cards, Receipts, timetables, ID cards, and class lists.
- [ ] No out-of-scope feature is present, and every earlier ticket's acceptance criteria pass together.