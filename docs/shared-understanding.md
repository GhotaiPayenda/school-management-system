# Shared Understanding — Meridian Academy

Status: **agreed**, implementation **not started** by owner request.
Agreed on: 2026-11-13.

This document is the build contract. The vocabulary it uses is defined in [GLOSSARY.md](../GLOSSARY.md); hard-to-reverse technical decisions are recorded in [docs/adr/](./adr/).

## Product and deployment

- One K-12 school, self-hosted, single-tenant, one SQLite database, designed for up to ~3,000 students and ~200 staff.
- PHP 8.2+ with PDO, no framework, no Composer dependency. Runs on `php -S`, XAMPP, or a shared host.
- React + Vite in plain JavaScript (no TypeScript), with Tailwind CSS, Framer Motion, axios, Redux Toolkit + Thunk, React Router, Radix primitives, Recharts, react-i18next, and React Hook Form + Zod.
- English is the default language, fully switchable to Dari (`fa-AF`) and Pashto (`ps-AF`), both RTL.
- Afghan defaults: Asia/Kabul, AFN, Saturday–Thursday teaching week with Friday off, academic year March–January in two semesters, Solar Hijri dates for Dari/Pashto and Gregorian for English. All configurable.
- Identity: Meridian Academy placeholder name and mark, replaceable in Settings.

## Academic domain

- Grades 1–12, each with Sections such as 10-A, a capacity, and a Homeroom Teacher.
- Subjects belong to Departments; a Lesson is a Subject assigned to a Period for a Section; Rooms are bookable spaces.
- Per-Section period grids: start time, period count, duration, and breaks are independent per Section. Default 7 periods × 45 minutes, reused every teaching day with optional per-day overrides.
- Curriculum per Grade Level: Subject list, code, Department, weekly Period load, exam flag, optional electives. Copied forward each Academic Year without changing history.
- Teaching Assignments link Teacher + Subject + Section + Academic Year; a Teacher can teach many combinations.
- Enrollment links a Student to one Section for one Academic Year. Statuses: active, transferred, withdrawn, graduated.
- Year-end promotion wizard: bulk promote a Section, mark retainees, graduate Grade 12. Mid-year Section transfer keeps history; re-admission creates a new Enrollment.
- Admission numbers like `M-2026-0001`. Multiple Guardians per Student with exactly one primary; siblings linked; photo required, documents optional.
- Staff records include employee number, qualification, specialization, hire date, contact, photo, and status. No payroll and no staff attendance in v1.

## Exams and results

- Every Subject has exactly two Exams per Academic Year:
  - First Exam at the end of Semester 1, marked out of 40.
  - Final Exam at the end of Semester 2, marked out of 60.
  - Annual Subject Score = First Exam Score + Final Exam Score, out of 100.
- Whole-number scores only. No classwork, quizzes, assignments, or midterms.
- Exam Schedule per Section: date, start time, duration, Room; printable.
- Subject Teachers enter marks for their assigned Sections; Admin reviews and publishes. A marking deadline is set per Exam. Post-publication edits require Admin unlock with a reason and an Audit Entry.
- A missed Exam is recorded Absent, not zero. Excused absence allows a makeup; unexcused absence scores zero.
- Overall Average is the equal-weight mean of all Annual Subject Scores.
- Letter Grade: A at 90+, B at 80+, C at 70+, D at 40+, Fail below 40.
- Pass rule: every Subject must reach 40. Any Subject below 40 becomes a Supplementary Exam: retake the whole Subject out of 100, cap the resulting score at 40, no Subject limit, optional per-Subject fee. Still below 40 after that means Retention.
- Semester Report Card after the First Exam: scores out of 40, total, percentage, attendance, rank, no Letter Grade yet.
- Annual Report Card: First /40, Final /60, Subject total /100, pass/fail per Subject, overall total, Overall Average, Letter Grade, Section rank, attendance, Homeroom remark, principal signature.
- Report Cards are batch-generated per Section, Admin-reviewed, published to portals, and printable in the active locale. Ties share a rank (1, 2, 2, 4). No multi-year transcript in v1.

## Attendance

- Daily attendance by Homeroom Teacher; statuses present, absent, late, excused with a reason.
- Teacher can correct the same day; Admin can correct until the month closes; closed months are locked.
- Late counts as present for the percentage but is reported separately. Excused absence counts as absent for the percentage but is reported separately.
- Report Card shows present, absent, late, excused, and percentage.
- Per-period attendance exists but is off by default.

## Finance

- Monthly invoicing, March–January (11 invoices, configurable to skip months), due on the 5th.
- Fee Structure per Grade Level with components such as tuition, admission, and exam fees.
- Admission fee on the first Invoice; exam fee on the first Invoice of each Semester.
- Partial Payments, numbered Receipts, Discounts (percentage or fixed; scholarship, sibling, staff), Refunds as audited reversals, Arrears reporting, and overpayment held as credit.
- Payment methods: cash, bank transfer, mobile money. Recorded by the Accountant/Admin.
- No general ledger, no online payment gateway, no late fee, no proration; Admin can add a manual charge.
- Invoice lifecycle: draft → issued → partially paid → paid or overdue.
- Library fines can optionally be pushed to the Student's next Invoice; Finance remains the only place money is received.

## Library

- Title catalog with Copies, each with an accession number; barcode field exists but entry is manual.
- Students: 2 Copies for 14 days. Staff: 5 Copies for 30 days. One renewal if not reserved.
- Fine 5 AFN/day, capped at replacement cost. Lost Copy = replacement cost + 100 AFN processing.
- No reservations, no barcode scanner hardware.
- Librarian and Admin can issue and return.

## Access and portals

- Roles: Super Admin, Principal/Admin, Registrar, Teacher, Accountant, Librarian, Student, Guardian.
- RBAC with Permissions; session httpOnly cookies, CSRF protection, no JWT.
- Accounts are Admin-created; no self-registration; Admin resets passwords; password change on first login.
- Student portal read-only: timetable, attendance, results, Report Cards, library loans, announcements.
- Guardian portal read-only: child switcher, attendance, results, invoices/arrears/payments, announcements.
- No guardian–teacher messaging, no online payment, no email/SMS dependency.
- Admissions are staff-entered only; the Applicant entity exists internally for a future public form.
- In-app Announcements targeted by role, Grade Level, or Section.

## Design

- Warm academic modernism: ivory/paper canvas, deep forest green primary, brass and terracotta accents, near-black ink.
- Typography: Fraunces or Instrument Serif for display, Inter for UI and data. Dari/Pashto use Noto Naskh Arabic for display and Noto Sans Arabic for UI.
- 14px radii, hairline warm borders, restrained shadows, subtle paper grain, generous whitespace, strong focus states.
- Light mode default with a designed dark mode. RTL is mirrored properly, not merely flipped text.
- Signature dashboard per role: greeting, KPI cards, attendance trend, fee collection, today's timetable, recent activity, pending tasks.
- Premium details: loading skeletons, meaningful empty states, inline validation, keyboard-accessible dialogs, print layouts for Report Cards, Receipts, ID cards, and class lists.
- Eastern Arabic-Indic digits ۰۱۲۳۴۵۶۷۸۹ in Dari/Pashto displays; Western digits accepted in inputs and normalized.

## Architecture

- Monorepo: `api/` (PHP), `web/` (React), `database/` (migrations and seeders), `storage/` (uploads and backups), `docs/`, `scripts/`.
- REST JSON under `/api/v1`, consistent envelope, pagination, filtering, sorting, validation errors, and proper status codes.
- Layered PHP: front controller → router → middleware → controller → service → repository → PDO. Prepared statements everywhere; `password_hash`, `random_bytes`, CSRF tokens, rate limiting on login.
- SQLite with WAL, foreign keys on, busy timeout, migration runner, seeders, and in-app backup/restore.
- Audit Entries for privileged actions across people, finance, grades, and settings.
- Archival/status over hard deletion for records with history.
- Frontend: app shell, role-aware routing, Redux slices with thunks, axios interceptors, i18n and RTL provider, design tokens, shared form and table components, print styles.
- Zod carries runtime payload validation since there is no TypeScript.
- CSV import/export templates for students, guardians, staff, and scores.
- PHP smoke tests for the API; frontend lint and production build are part of acceptance.

## Build order

1. Foundation — repo, design tokens, app shell, i18n/RTL, auth, settings, migrations, seed skeleton.
2. Academic setup — years, semesters, grades, sections, subjects, departments, rooms, period grids, curriculum, timetable.
3. People — staff, students, guardians, admissions, enrollment, promotion.
4. Attendance — daily marking, summaries, corrections, locks.
5. Exams and results — schedules, mark entry, publication, supplementary exams, Report Cards.
6. Finance — fee structures, monthly invoices, payments, discounts, refunds, receipts, arrears.
7. Library — catalog, copies, loans, fines.
8. Portals, announcements, dashboards, imports/exports, backup, audit UI, print, polish, seed, smoke tests, README.

## Defaults unless objected

- Password minimum 8 characters; session lifetime 8 hours; login rate limiting.
- Upload limits: 2 MB photos, 5 MB documents; stored outside the web root and served through PHP.
- Invoice numbers `INV-2026-000001`; receipt numbers `RCP-2026-000001`; exam IDs `EXM-2026-0001`.
- Report Cards are A4 portrait, with school header, photo, signature lines, and locale-aware labels.
- Seed data: 12 grades, two Sections per grade, Afghan names, standard Afghan K-12 subjects, demo accounts for every role, sample fees, attendance, exams, and library loans.
- `README.md` covers XAMPP and `php -S` setup, seeding, default logins, backup/restore, and locale switching.

## Out of scope for v1

Transport, hostel/boarding, payroll, inventory, HR leave, LMS/course content, SMS/email gateways, biometric devices, document e-signing, online payments, library reservations, barcode hardware, multi-year transcripts, and multi-tenancy.

## Done means

The app runs from a fresh checkout on PHP and Node, seeds a complete demo school, logs in as every role, and every module above works end-to-end in English, Dari, and Pashto — including RTL layout, Solar Hijri dates, exam entry, report-card generation, monthly invoicing, library circulation, backup/restore, and print.

## Placeholders to replace when available

- Real school name, logo, and contact details.
- Real subject list per Grade Level if it differs from the standard Afghan seed.
- Real fee amounts, library limits, and fine amounts.
- Existing student, guardian, staff, or historical-mark data for import.
