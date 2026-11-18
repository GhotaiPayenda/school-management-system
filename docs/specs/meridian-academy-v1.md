# Meridian Academy — School Management System v1

Status: **draft spec**. Pending test-seam confirmation and issue-tracker publication. No implementation started.

## Problem Statement

Meridian Academy runs a K-12 school on paper registers and disconnected spreadsheets. Student and guardian records, enrollment history, attendance, exam marks, report cards, monthly fees, and library loans live in different places, so staff re-enter the same information, mistakes are hard to trace, and nobody has a reliable whole-school view. Report cards are calculated by hand, fee collection is reconciled manually, guardians cannot see attendance or results without visiting the school, and the library has no dependable record of which Copy is with whom.

Generic school-management products do not fit the school's rules or context. They assume continuous assessment rather than two exams per Subject, use Western terms and calendar defaults, treat right-to-left Dari and Pashto as an afterthought, require reliable internet and recurring cloud subscriptions, and are priced for large institutions. The school needs a self-hosted system that matches its actual academic model, works on ordinary school hardware over the local network, and feels premium enough that staff and guardians will actually use it.

## Solution

Build a single-tenant, self-hosted school management system for Meridian Academy with one SQLite database, a PHP API, and a React single-page application. The system covers academic setup, staff and student records, admissions and enrollment, daily attendance, the school's two-exam assessment model, report cards, monthly fee collection, library circulation, role-specific dashboards, announcements, audit history, backups, and CSV import/export.

The interface is trilingual — English by default, with complete Dari and Pashto translations and true RTL layout — and respects Afghan conventions: Solar Hijri dates for Dari and Pashto, Gregorian for English, AFN, Asia/Kabul, and a Saturday–Thursday teaching week. It runs on a school server or XAMPP installation, is usable over the local network without external services, and produces print-ready report cards, receipts, ID cards, timetables, and class lists. The visual direction is warm academic modernism: ivory and forest green, serif display type, restrained brass and terracotta accents, generous whitespace, light and dark modes.

## User Stories

### Access and accounts

1. As a Super Admin, I want to sign in with an admin-created account, so that only authorized people can reach school records.
2. As a Super Admin, I want to be forced to change a temporary password on first login, so that a shared initial credential cannot be reused.
3. As a Super Admin, I want to create a User linked to a Staff, Student, or Guardian record, so that each login maps to a real person.
4. As a Super Admin, I want to assign exactly one Role to a User, so that duties stay clearly separated.
5. As a Super Admin, I want to adjust which Permissions a Role holds, so that responsibilities can change without code changes.
6. As a Super Admin, I want to reset a User's password, so that locked-out staff and guardians can regain access without email.
7. As a Super Admin, I want to deactivate a User, so that departed staff and former guardians lose access immediately.
8. As any User, I want to log out, so that a shared school computer does not stay authenticated.
9. As any User, I want my session to expire after inactivity, so that unattended machines are not a security hole.
10. As any User, I want a clear localized message when I lack permission, so that I understand why an action is unavailable.
11. As a Teacher, I want to see only the Sections and Subjects assigned to me, so that I cannot browse unrelated student data.
12. As an Accountant, I want access only to finance screens and student fee context, so that academic and library data stay private.
13. As a Librarian, I want access only to library screens and borrower context, so that finance and grades stay private.
14. As a Principal, I want a whole-school view with role-appropriate write access, so that I can oversee without bypassing safeguards.
15. As a Super Admin, I want login attempts rate-limited, so that password guessing is impractical.

### School settings and localization

16. As a Super Admin, I want to set the school name, logo, address, phone, and email, so that every printed document carries the real identity.
17. As a Super Admin, I want to set currency, timezone, and date conventions, so that money and dates match the school's context.
18. As a Super Admin, I want to set the Academic Year start and end dates, so that enrollment, attendance, and invoices follow the real calendar.
19. As a Super Admin, I want to set the two Semester date ranges, so that exams and report cards land in the right period.
20. As a Super Admin, I want to choose which weekdays are teaching days, so that the timetable matches the school week.
21. As a Super Admin, I want to set the default UI language, so that English ships by default while Dari and Pashto remain one click away.
22. As any User, I want to switch the UI language at any time, so that I can work in English, Dari, or Pashto.
23. As a Dari or Pashto user, I want the entire layout mirrored right-to-left, so that the interface reads naturally rather than looking like flipped English.
24. As a Dari or Pashto user, I want Solar Hijri dates alongside or instead of Gregorian dates, so that dates match local documents.
25. As a Dari or Pashto user, I want Eastern Arabic-Indic digits in displays while still being able to type Western digits, so that data entry stays fast and printed output looks local.
26. As a Super Admin, I want Subject, Department, and Fee Component names stored with English, Dari, and Pashto labels, so that catalog data translates with the UI.
27. As any User, I want a light or dark theme, so that the screen is comfortable in different lighting.
28. As a Super Admin, I want to configure library limits and fine rates, so that policy changes do not require a developer.
29. As a Super Admin, I want a single School Settings record, so that there is no ambiguity about which configuration is active.

### Academic setup

30. As a Registrar, I want to create an Academic Year, so that enrollment and invoices are scoped to a real cycle.
31. As a Registrar, I want to copy the previous year's grades, sections, subjects, and period grids into a new Academic Year, so that setup does not start from zero.
32. As a Registrar, I want to create Grade Levels 1–12, so that the school's structure is represented.
33. As a Registrar, I want to create Sections within a Grade Level, such as 10-A and 10-B, so that students are grouped into teachable cohorts.
34. As a Registrar, I want to set a Section's capacity and Homeroom Teacher, so that enrollment and daily attendance have an owner.
35. As a Registrar, I want to create Departments, so that Subjects are grouped academically rather than administratively.
36. As a Registrar, I want to create Subjects with a unique code, Department, and exam flag, so that marks and report cards refer to stable definitions.
37. As a Registrar, I want to assign Subjects to each Grade Level with a weekly Period load and optional elective flag, so that the curriculum reflects what is actually taught.
38. As a Registrar, I want to create Rooms, so that timetable and exam scheduling can avoid physical conflicts.
39. As a Registrar, I want to configure a Section's Period grid — start time, period count, duration, and breaks — so that different Sections can run different days.
40. As a Registrar, I want to add holidays and closure days to the Academic Year, so that attendance and timetables skip non-teaching dates.
41. As a Registrar, I want to assign a Teacher to a Subject and Section for an Academic Year, so that the right person can enter marks.
42. As a Registrar, I want to set a Homeroom Teacher per Section, so that daily attendance has a clear owner.
43. As a Registrar, I want to view a timetable by Section, Teacher, or Room, so that I can resolve scheduling questions from any angle.
44. As a Registrar, I want the system to block Teacher, Room, and Section conflicts using real start and end times, so that overlapping Period grids cannot create silent double-bookings.
45. As a Registrar, I want to print a Section's timetable, so that students and teachers receive a physical copy.

### People and admissions

46. As a Registrar, I want to register a Student with personal details, admission number, photo, and optional documents, so that there is one authoritative record.
47. As a Registrar, I want admission numbers generated automatically in a configurable format, so that records stay consistent without manual bookkeeping.
48. As a Registrar, I want to record multiple Guardians per Student with a relationship and exactly one primary contact, so that the school knows who to call.
49. As a Registrar, I want to link siblings, so that families are visible as a unit.
50. As a Registrar, I want to search and filter Students by name, admission number, Grade Level, Section, and status, so that I can find a record quickly.
51. As a Registrar, I want a Student profile showing enrollment history, guardians, attendance, results, invoices, and library loans, so that I can answer parent questions in one place.
52. As a Registrar, I want to edit or archive a Student without deleting their history, so that records remain auditable.
53. As a Registrar, I want to maintain Staff records with employee number, qualification, specialization, hire date, contact, photo, and status, so that employment data is not scattered.
54. As a Registrar, I want to distinguish Teachers from other Staff and assign teaching duties, so that only Teachers appear in academic assignments.
55. As a Registrar, I want to create an Applicant record for a prospective student, so that admissions can be tracked before a Student exists.
56. As a Registrar, I want to admit an Applicant, creating the Student and first Enrollment, so that the admission decision and the academic record are linked.
57. As a Registrar, I want to enroll students into a Section in bulk, so that opening a new class does not require one-by-one entry.
58. As a Registrar, I want to transfer a Student between Sections mid-year while keeping history, so that legitimate moves are recorded rather than hidden.
59. As a Registrar, I want to mark a Student as transferred out or withdrawn, so that they leave the active roster without losing records.
60. As a Registrar, I want to re-admit a former Student with a new Enrollment, so that returning students continue their history.
61. As a Registrar, I want to import Students, Guardians, and Staff from CSV with a validation report before committing, so that existing spreadsheets can be brought in safely.
62. As a Registrar, I want to export Student, Guardian, and Staff lists to CSV, so that data can be shared or backed up outside the system.
63. As a Registrar, I want to print Student ID cards, so that students have a physical identity document.
64. As a Registrar, I want to print class lists, so that teachers receive an accurate roster.
65. As a Registrar, I want duplicate admission numbers and employee numbers rejected, so that records cannot collide.

### Enrollment and promotion

66. As a Registrar, I want a year-end promotion wizard that moves a whole Section to the next Grade Level, so that rollover is fast and consistent.
67. As a Registrar, I want to preview a promotion before committing it, so that mistakes are caught before hundreds of records change.
68. As a Registrar, I want to mark individual students as retained, so that repeaters stay in the same Grade Level.
69. As a Registrar, I want to graduate Grade 12 students, so that they leave the active roster with a final status.
70. As a Registrar, I want each Student's full Enrollment history, so that past Sections and Academic Years remain visible.
71. As a Registrar, I want a capacity warning when a Section is overfilled, so that I can open another Section or adjust enrollment.
72. As a Registrar, I want duplicate active Enrollments for the same Student and Academic Year prevented, so that a student cannot accidentally appear in two Sections.
73. As a Registrar, I want the new Academic Year's curriculum copied forward and editable, so that history is preserved while the future can change.

### Attendance

74. As a Homeroom Teacher, I want a daily attendance grid for my Section, so that I can mark the whole class quickly.
75. As a Homeroom Teacher, I want a one-click "mark all present" action, so that the common case takes seconds.
76. As a Homeroom Teacher, I want to mark absent, late, or excused with a reason, so that the record reflects what happened.
77. As a Homeroom Teacher, I want to correct today's attendance, so that a mistake made during roll call can be fixed immediately.
78. As an Admin, I want to correct attendance until the month closes, so that late-reported excused absences can still be recorded.
79. As an Admin, I want to lock a month after review, so that published attendance percentages cannot silently change.
80. As a Homeroom Teacher, I want a daily attendance summary for my Section, so that I can see who is missing at a glance.
81. As a Principal, I want monthly attendance summaries by Section and Grade Level, so that I can spot patterns.
82. As a Principal, I want attendance percentages per Student, so that report cards and parent conversations use the same number.
83. As a Homeroom Teacher, I want future dates and holidays blocked, so that invalid Attendance Records cannot be created.
84. As an Admin, I want optional per-Period attendance, so that schools that need it can enable it without changing the default.
85. As a Registrar, I want to export attendance to CSV, so that external reporting is possible.
86. As a Guardian, I want to see my child's attendance history, so that I know about absences without waiting for a call.

### Exams and results

87. As a Registrar, I want each Subject to have exactly one First Exam and one Final Exam per Academic Year, so that the assessment model matches school policy.
88. As a Registrar, I want the First Exam marked out of 40 and the Final Exam out of 60, so that the Annual Subject Score is a simple sum out of 100.
89. As a Registrar, I want an Exam Schedule per Section with date, start time, duration, and Room, so that exams are organized and printable.
90. As a Registrar, I want exam scheduling to detect Section, Teacher, and Room conflicts, so that students and staff are not double-booked.
91. As a Registrar, I want to print a Section's Exam Schedule, so that students know when and where to sit.
92. As a Subject Teacher, I want to enter First Exam scores for my assigned Sections, so that Semester 1 results are captured.
93. As a Subject Teacher, I want to enter Final Exam scores for my assigned Sections, so that annual results can be calculated.
94. As a Subject Teacher, I want scores outside 0–40 or 0–60 rejected, so that impossible marks cannot be saved.
95. As a Subject Teacher, I want to save marks as a draft before publishing, so that I can finish entry over time.
96. As a Subject Teacher, I want to mark a Student absent for an Exam rather than entering zero, so that absence and failure are distinguishable.
97. As a Subject Teacher, I want to record a makeup score for an excused absence, so that a legitimate absence does not become a failure.
98. As an Admin, I want to review and publish exam results, so that no score reaches a report card unreviewed.
99. As an Admin, I want to lock published marks, so that report cards cannot change accidentally.
100. As an Admin, I want to unlock published marks with a written reason, so that genuine corrections are possible and auditable.
101. As a Principal, I want Annual Subject Scores calculated automatically from the two Exams, so that report cards do not depend on manual arithmetic.
102. As a Principal, I want the Overall Average to be the equal-weight mean of all Annual Subject Scores, so that every Subject counts.
103. As a Principal, I want Letter Grades derived automatically — A at 90+, B at 80+, C at 70+, D at 40+, Fail below 40 — so that grading is consistent.
104. As a Principal, I want Students ranked within their Section on Overall Average with shared ranks for ties, so that rank is fair and explainable.
105. As an Admin, I want every Subject below 40 flagged for Supplementary Exam, so that failed Subjects are not missed.
106. As an Admin, I want to enter a Supplementary Exam score out of 100 and cap the resulting Annual Subject Score at 40, so that a supplementary pass cannot inflate the Letter Grade.
107. As an Admin, I want a Student retained when a Subject is still below 40 after the Supplementary Exam, so that promotion rules are enforced.
108. As a Principal, I want to view results by Section and Subject, so that I can compare teaching outcomes.
109. As a Registrar, I want to export exam scores to CSV, so that external analysis is possible.
110. As an Admin, I want to generate Semester Report Cards for a whole Section in one action, so that reporting is not one student at a time.
111. As a Homeroom Teacher, I want to add a remark to a Student's Annual Report Card, so that the report includes pastoral context.
112. As a Principal, I want my name and signature line on the Annual Report Card, so that the document is official.
113. As an Admin, I want to publish Report Cards to Student and Guardian portals, so that families see results without paper collection.
114. As a Guardian, I want to print or download my child's Report Card in the active language, so that I have a copy I can read.
115. As an Admin, I want a reissued Report Card to create a new version after a correction, so that previously issued documents remain traceable.
116. As a Principal, I want to see which Report Cards are unpublished, so that no Section is forgotten at the end of a term.
117. As a Subject Teacher, I want to see my marking deadlines, so that I know when score entry closes.
118. As an Admin, I want to set a marking deadline per Exam, so that report-card production has a schedule.

### Finance

119. As an Accountant, I want a Fee Structure per Grade Level with recurring and one-time Fee Components, so that billing matches the school's policy.
120. As an Accountant, I want to set monthly tuition, admission, and exam fees per Grade Level, so that each grade can be priced differently.
121. As an Accountant, I want to generate monthly Invoices for all active Students, so that billing is not manual.
122. As an Accountant, I want to preview draft Invoices before issuing them, so that mistakes are caught before guardians see them.
123. As an Accountant, I want to issue Invoices with a due date, so that the school has a clear collection expectation.
124. As an Accountant, I want to record a partial Payment against an Invoice, so that families can pay in installments.
125. As an Accountant, I want to record a full Payment, so that the common case is fast.
126. As an Accountant, I want every Payment to produce a numbered Receipt, so that families and the school have matching proof.
127. As an Accountant, I want to apply a percentage or fixed Discount to a Student's Invoice, so that scholarships, siblings, and staff concessions are handled.
128. As an Accountant, I want to record a Refund as an audited reversal of a Payment, so that money returned is traceable.
129. As an Accountant, I want overpayment held as credit and applied to the next Invoice, so that families are not forced to chase change.
130. As an Accountant, I want an Arrears report by Grade Level and Section, so that follow-up is targeted.
131. As an Accountant, I want a Student ledger showing Invoices, Payments, Discounts, Refunds, and balance, so that a parent conversation has one source of truth.
132. As an Accountant, I want to record cash, bank transfer, and mobile money Payments, so that real payment methods are represented.
133. As an Accountant, I want Invoice and Receipt numbers generated sequentially, so that documents are auditable.
134. As an Accountant, I want to print a Receipt in the active language, so that the family receives a readable document.
135. As a Guardian, I want to see my children's Invoices, Payments, and outstanding balance, so that I know what is owed.
136. As an Accountant, I want to push a library Fine to the Student's next Invoice, so that money is collected in one place.
137. As an Accountant, I want to add a manual charge to an Invoice, so that exceptional costs are possible.
138. As a Principal, I want a monthly collection summary, so that I can see expected versus collected.
139. As an Accountant, I want to export finance data to CSV, so that the school's bookkeeper can reconcile externally.
140. As a Super Admin, I want every Payment, Discount, Refund, and manual charge audited, so that financial changes are traceable.
141. As an Accountant, I want to see which Students have never been invoiced in a month, so that billing gaps are visible.
142. As an Accountant, I want duplicate Payment submissions prevented, so that a refresh cannot double-charge a family.

### Library

143. As a Librarian, I want to catalog a Title with author, ISBN, category, publisher, and description, so that the collection is searchable.
144. As a Librarian, I want to add multiple Copies of a Title with unique accession numbers, so that physical books are individually tracked.
145. As a Librarian, I want to search the catalog by title, author, ISBN, and category, so that I can find a book quickly.
146. As a Librarian, I want to issue a Copy to a Student or Staff member with a due date, so that loans are recorded.
147. As a Librarian, I want the due date calculated from the borrower's Role policy, so that students and staff get the right loan period.
148. As a Librarian, I want to return a Copy and free it for the next borrower, so that availability is accurate.
149. As a Librarian, I want one renewal when a Copy is not reserved, so that ordinary extensions are easy.
150. As a Librarian, I want overdue Fines calculated per day and capped at replacement cost, so that charges are fair and predictable.
151. As a Librarian, I want to record a lost or damaged Copy with a replacement charge, so that the collection's value is accounted for.
152. As a Librarian, I want loan limits enforced by borrower Role, so that one person cannot take the whole shelf.
153. As a Librarian, I want an overdue list, so that follow-up is proactive.
154. As an Accountant, I want a library Fine optionally added to the next Invoice, so that collection is centralized.
155. As a Student or Staff member, I want to see my current and past Loans, so that I know what I have and when it is due.
156. As a Librarian, I want accession numbers to be unique, so that two Copies cannot share an identity.

### Portals, dashboards, and announcements

157. As a Principal, I want a dashboard with enrollment, attendance, fee collection, upcoming exams, and recent activity, so that I can spot issues early.
158. As a Teacher, I want a dashboard with my Sections, today's Lessons, pending marks, and attendance tasks, so that I know what needs attention.
159. As a Student, I want a dashboard with my timetable, attendance, latest results, library loans, and announcements, so that I can manage my school life.
160. As a Guardian, I want a dashboard for each child with attendance, results, fees, and announcements, so that I can stay informed.
161. As an Admin, I want to publish an Announcement to all users, a Role, a Grade Level, or a Section, so that messages reach the right audience.
162. As any User, I want to read Announcements in my language, so that I do not miss school communication.
163. As a Student, I want to view my weekly timetable, so that I know where to be.
164. As a Student, I want to view my attendance history, so that I can track my own record.
165. As a Student, I want to view my exam results and Annual Report Card, so that I know how I am doing.
166. As a Guardian, I want to switch between my children, so that one login covers the family.
167. As a Guardian, I want to view my child's Report Cards and print them, so that I have an official copy.
168. As a Student, I want to see my library Loans and due dates, so that I avoid Fines.
169. As a Guardian, I want to see my child's outstanding balance, so that I can plan payment.
170. As an Admin, I want to see which Announcements are published, so that I can correct or archive them.

### Operations and quality

171. As a Super Admin, I want an Audit Entry for every privileged action with actor, time, record, and reason, so that changes are traceable.
172. As a Super Admin, I want to filter the audit history by actor, module, and date, so that investigations are practical.
173. As a Super Admin, I want to download a SQLite backup, so that the school can recover from mistakes or hardware failure.
174. As a Super Admin, I want to restore a backup with an explicit confirmation, so that recovery is possible without accidental data loss.
175. As a Super Admin, I want CSV templates for Students, Guardians, Staff, and scores, so that imports are predictable.
176. As a Super Admin, I want an import dry run that reports invalid rows before committing, so that bad data does not enter the system.
177. As a Super Admin, I want to export core lists and reports, so that data is portable.
178. As a Super Admin, I want a health check showing database, storage, and backup status, so that problems are visible before they become outages.
179. As a Super Admin, I want to seed a complete demo school, so that the system can be evaluated without entering data first.
180. As any User, I want search, filtering, sorting, and pagination on every large list, so that the system stays usable as data grows.
181. As any User, I want meaningful empty states, so that a blank screen never looks broken.
182. As any User, I want loading skeletons instead of layout jumps, so that the interface feels calm and premium.
183. As a keyboard user, I want dialogs, menus, and forms fully operable without a mouse, so that accessibility is not an afterthought.
184. As any User, I want a dark mode that is designed rather than inverted, so that long sessions are comfortable.
185. As a Teacher, I want attendance and mark entry to work on a phone, so that I can work from the classroom.
186. As any User, I want print layouts for Report Cards, Receipts, timetables, ID cards, and class lists, so that physical documents look official.
187. As any User, I want errors in my active language with a clear next step, so that I can recover without guessing.
188. As a Super Admin, I want the system to run without external services, so that a school with unreliable internet is not blocked.

## Implementation Decisions

### System shape and constraints

- Single-tenant deployment: one school, one SQLite database, one School Settings record. No `school_id` isolation and no multi-tenancy.
- Backend is PHP 8.2+ with PDO, a hand-written front controller, router, middleware pipeline, controllers, services, repositories, migrations, and seeders. No framework and no Composer dependency.
- Frontend is React with Vite in plain JavaScript. No TypeScript. Tailwind CSS, Framer Motion, axios, Redux Toolkit with Thunk, React Router, Radix primitives, Recharts, react-i18next, React Hook Form, and Zod.
- API is REST over JSON under `/api/v1`. The SPA is served from the same origin in production; Vite proxies the API in development.
- Authentication uses httpOnly session cookies with SameSite protection and CSRF tokens. No JWT. Login is rate-limited; sessions rotate on login and expire after inactivity.
- SQLite runs in WAL mode with foreign keys enabled, a busy timeout, and short write transactions. The database file and uploads live outside the web root; backups are downloadable copies.

### Domain model

The schema is greenfield. The following entities and invariants define it:

- **School Settings**: one row holding identity, logo, currency, timezone, default language, teaching days, grading policy, library policy, and invoice defaults.
- **Academic Year → Semester**: one Academic Year has exactly two Semesters; date ranges may not overlap. Only one Academic Year is current.
- **Grade Level → Section**: Grade Levels 1–12. Sections are unique within a Grade Level and Academic Year and carry capacity and Homeroom Teacher.
- **Department → Subject**: Subjects have a unique code, a Department, and an exam flag. A Subject may appear in several Grade Levels through a Curriculum entry.
- **Curriculum**: one entry per Grade Level and Subject per Academic Year, carrying weekly Period load and an elective flag. Curriculum is copied forward, never mutated retroactively.
- **Room, Period, Break, Lesson**: Periods belong to a Section and carry order, start time, end time, and kind. Periods in a Section may not overlap. A Lesson assigns a Subject and Teacher to a Period for a Section on a teaching day.
- **Holiday**: a dated non-teaching day within an Academic Year.
- **Teaching Assignment**: unique Teacher + Subject + Section + Academic Year. Homeroom Teacher is a separate Section assignment.
- **Staff**: employee number, personal details, qualification, specialization, hire date, photo, status, and optional User link.
- **Student**: admission number, personal details, photo, status, and optional User link.
- **Guardian**: personal details, contact information, and optional User link. StudentGuardian carries relationship and a primary flag; exactly one primary Guardian per Student.
- **Applicant → Admission → Student**: an Applicant is not a Student until admitted. Admission creates the Student and first Enrollment and records the decision.
- **Enrollment**: Student + Section + Academic Year, with status active, transferred, withdrawn, or graduated. At most one active Enrollment per Student per Academic Year.
- **Promotion**: records source Section, target Section or retention/graduation outcome, Academic Year, and actor. Promotion is a batch operation with a preview.
- **Attendance Record**: unique Student + Section + date, with status present, absent, late, or excused, an optional reason, and the User who recorded it. Monthly locks prevent edits after close.
- **Exam**: belongs to Subject, Semester, Academic Year, and type First or Final; maximum score is 40 or 60 respectively. One First Exam and one Final Exam per Subject per Academic Year.
- **Exam Schedule**: Exam + Section + date + start time + duration + Room. Section, Teacher, and Room conflicts are rejected on real times.
- **Exam Score**: unique Exam + Student, whole number within the Exam maximum, with an absent flag and a draft/published state.
- **Supplementary Exam**: Student + Subject + Academic Year, score out of 100, capped at 40 for the Annual Subject Score, with a pass/fail outcome.
- **Semester Report Card**: Student + Semester, snapshotting First Exam Scores, total, percentage, attendance, rank, and remarks at publication.
- **Annual Report Card**: Student + Academic Year, snapshotting First Exam, Final Exam, Annual Subject Score, Subject Result, Overall Average, Letter Grade, rank, attendance, Homeroom remark, and principal signature at publication. Reissue creates a new version; published snapshots are immutable.
- **Fee Structure → Fee Component**: Fee Structure per Grade Level and Academic Year. Components carry a kind (monthly recurring, one-time, per Semester), amount, and translation labels.
- **Billing Period**: one calendar month. A Student may have at most one Invoice per Billing Period.
- **Invoice → Invoice Item**: Invoice snapshots its items, discounts, total, due date, and status (draft, issued, partially paid, paid, overdue, void). Editing a Fee Structure never changes an issued Invoice.
- **Payment → Receipt**: Payment records amount, method (cash, bank transfer, mobile money), date, recorder, and an idempotency key. Each successful Payment produces one numbered Receipt.
- **Discount, Refund, Credit**: Discounts are percentage or fixed and tied to a Student/Invoice; Refunds reference a Payment and require a reason; Credit is a Student balance applied to future Invoices.
- **Library Title → Copy**: Title holds bibliographic data; Copy holds a unique accession number, status, and optional barcode value. Copy status transitions available → on loan → available or lost/damaged.
- **Loan**: Copy + borrower (Student or Staff) + issued date + due date + returned date + renewal count. A Copy cannot have two open Loans.
- **Fine**: Loan + amount + reason (late, damaged, lost) + settled flag. A Fine may be pushed to an Invoice once.
- **User, Role, Permission**: one Role per User, Permissions attached to Roles. Role permissions are editable by the Super Admin with a guard against removing the last Super Admin capability.
- **Announcement → Announcement Target**: target by Role, Grade Level, or Section. Announcements are plain text with line breaks; no HTML.
- **Audit Entry**: append-only actor, action, entity, entity id, before/after summary, reason, timestamp, and request context. Never updated or deleted.
- **Document**: polymorphic metadata for Student, Staff, and Applicant files; stored outside the web root and served only through authorized endpoints.

### Derived rules

- **Annual Subject Score** = First Exam Score + Final Exam Score. Whole numbers only.
- **Subject Result** passes when the Annual Subject Score is at least 40.
- **Overall Average** = equal-weight mean of all Annual Subject Scores. All Subjects count; there are no credit weights.
- **Letter Grade** = A at 90+, B at 80+, C at 70+, D at 40+, Fail below 40. The Letter Grade is overall, not per Subject.
- **Rank** is computed within the Section from Overall Average, descending. Ties share a rank and the next rank skips (1, 2, 2, 4).
- **Supplementary Exam** replaces the Annual Subject Score for that Subject with the supplementary score, capped at 40. It cannot raise the Letter Grade above D. A Subject still below 40 after the Supplementary Exam causes Retention.
- **Attendance percentage** = (present + late) ÷ total teaching days. Late is also reported separately. Excused absence counts as absent for the percentage but is reported separately.
- **Invoice balance** = invoiced total − discounts − Payments + applied credits. Arrears are balances on issued Invoices past the due date.
- **Library Fine** = days late × daily rate, capped at the Copy's replacement cost. Lost Copy charge = replacement cost + processing fee.
- **Snapshots over recomputation**: published Report Cards and issued Invoices are immutable snapshots. Corrections create new versions; they do not rewrite history.

### API contracts

- Envelope: successful responses return data plus pagination metadata where relevant; errors return a stable machine-readable code, a localized message key, and field-level details. HTTP status codes are used correctly (400, 401, 403, 404, 409, 422, 429, 500).
- Authentication: login, logout, current user, change password, and admin password reset. Login sets a session cookie and returns the user, Role, Permissions, and locale preferences.
- Settings: read and update School Settings, including identity, locale, calendar, grading, library, and invoice defaults.
- Academic structure: CRUD for Academic Years, Semesters, Grade Levels, Sections, Departments, Subjects, Curriculum entries, Rooms, Period grids, Breaks, Holidays, and Teaching Assignments. Read models for Section, Teacher, and Room timetables.
- People: CRUD for Students, Guardians, Staff, Applicants, and Admissions; Student profile aggregate; StudentGuardian management; document upload/download; CSV import dry run and commit; CSV export.
- Enrollment: create, transfer, withdraw, re-admit; batch enrollment; promotion preview and commit; graduation.
- Attendance: bulk daily marking, single correction, monthly summaries, Student history, month lock and unlock, CSV export.
- Exams: CRUD for Exams and Exam Schedules; conflict validation; bulk Exam Score entry and draft save; publish and lock; unlock with reason; Supplementary Exam entry; result summaries; CSV export.
- Report Cards: batch generate, preview, add remarks, publish, reissue, and fetch print data for Semester and Annual types.
- Finance: Fee Structure CRUD; draft Invoice generation; preview, issue, void; Payment recording with idempotency; Receipt retrieval; Discount, Refund, and Credit operations; Student ledger; Arrears; collection summary; CSV export.
- Library: Title and Copy CRUD; catalog search; issue, return, renew; Fine calculation and settlement; lost/damaged handling; overdue list; push Fine to Invoice.
- Portals: role-scoped dashboard aggregates; Student and Guardian self-service reads; Announcement read state.
- Announcements: CRUD, targeting, publish, archive.
- Operations: Audit Entry list and filters; backup download; restore with confirmation; health check; seed command.
- Bulk endpoints exist for attendance, Exam Scores, promotion, Invoice generation, and CSV imports. Every bulk endpoint validates the whole payload and reports row-level errors without partial commits unless explicitly requested.
- Payment creation requires an idempotency key so a retried request cannot double-record money.
- All list endpoints support pagination, filtering, sorting, and a maximum page size.
- All timestamps are stored in UTC; display uses Asia/Kabul. Calendar dates are stored as ISO dates; Solar Hijri is a presentation concern.

### Frontend

- Role-aware application shell with a persistent sidebar, top bar, language switcher, theme switcher, and user menu. Navigation is generated from Permissions, not hardcoded per page.
- Routes for login, dashboard, students, guardians, staff, admissions, academic setup, curriculum, timetable, attendance, exams, report cards, finance, library, announcements, settings, audit, and profile.
- Redux Toolkit store with one slice per domain, async thunks for API calls, and memoized selectors. No second server-state library.
- A single axios instance attaches CSRF tokens, normalizes errors, handles session expiry, and never silently retries writes.
- Forms use React Hook Form with Zod schemas shared between create and edit flows. Server validation errors map back to fields.
- Tables use server-side pagination, filtering, and sorting; saved filters are not required in v1.
- Recharts for dashboards; charts use accessible color tokens and provide textual summaries.
- Framer Motion is restrained: page-level fades, staggered card entry, and drawer/dialog transitions. No animation blocks input or ignores reduced-motion preferences.
- i18next provides en, fa-AF, and ps-AF catalogs. The document direction and all physical CSS values switch with the locale; components use logical properties.
- Fonts: Fraunces or Instrument Serif for Latin display, Inter for Latin UI, Noto Naskh Arabic for Arabic-script display, Noto Sans Arabic for Arabic-script UI.
- Eastern Arabic-Indic digits are used in Dari and Pashto displays. Inputs accept both digit sets and normalize to Western digits before submission.
- Dates display as Solar Hijri in Dari and Pashto and Gregorian in English, with a Gregorian/Solar toggle where useful. Storage remains ISO.
- Print views exist for Semester and Annual Report Cards, Receipts, timetables, ID cards, class lists, Exam Schedules, and class profiles. Printing uses browser print CSS; no server-side PDF library.
- The UI is responsive with a mobile-friendly attendance grid and score entry, but the primary admin experience is desktop.
- Accessibility target is WCAG 2.1 AA: semantic landmarks, visible focus, labelled controls, keyboard-operable dialogs and menus, sufficient contrast, and reduced-motion support.

### Classes read model

- **Classes** is the staff-facing read model over Section records, grouped by Academic Year and Grade Level. It is not a new entity and is never a Lesson.
- Access uses a dedicated `academic.view` Permission granted to Super Admin, Principal, Registrar, Teacher, Accountant, and Librarian. Student and Guardian do not receive it, and Teacher access is scoped to Sections they lead or teach.
- `GET /classes` returns one card per Section with identity, Grade Level, Academic Year, Homeroom Teacher, capacity and Enrollment counts, Subject and Unassigned Subject counts, and Attendance rate. The list defaults to the current Academic Year and supports a year filter and an all-years view.
- `GET /sections/{id}/profile` returns the header, counts, sibling Sections for the same class name, the roster, Teaching Assignments grouped by Teacher, the curriculum with staffing, and the weekly Timetable grid.
- `GET /sections/{id}/attendance` resolves the day by the teaching calendar and returns the day roster plus per-Student and Section Semester summaries. Per-period records collapse to one status per Student per date using daily-first, then absent, late, excused, present.
- The class record reuses the existing Section results read model and adds no grading arithmetic. Unpublished Exam Scores display as pending.
- Attendance and Results honour `attendance.view` and `exams.view` independently; the rest of the record remains readable when either is missing.
- The record prints as one localized sheet with school header, identity, roster, Teachers and Subjects, Timetable, Attendance summary, and Results summary. Panels the viewer cannot read are omitted from the sheet.
- The `pageSize` query parameter is accepted as an alias of `perPage` by the shared pagination reader.

### Design system

- Palette: warm ivory canvas, deep forest green primary, brass and terracotta accents, near-black ink, muted sage support tones, and a dedicated danger tone that is not terracotta.
- Typography scale: serif display for page titles and hero numbers; Inter for body, labels, tables, and controls; tabular numerals for money and marks.
- Spacing follows a 4px base with generous page padding. Radii are 12–16px for cards and 8–10px for controls.
- Surfaces use hairline warm borders and restrained shadows rather than heavy elevation. A subtle paper grain is optional and must not reduce text contrast.
- Light mode is default; dark mode uses deep green-black surfaces, warm off-white text, and adjusted accent luminance. Neither mode is a simple inversion of the other.
- Signature dashboard: greeting, KPI cards, attendance trend, fee collection progress, today's timetable, pending tasks, and recent activity.
- Shared components: buttons, inputs, selects, comboboxes, date pickers, tables, badges, tabs, dialogs, drawers, toasts, empty states, skeletons, pagination, confirmation prompts, file upload, and print headers.
- Empty states, loading states, and error states are designed, not default browser output.

### Security and data integrity

- Passwords are hashed with PHP's password API using a modern algorithm. Minimum length is 8 characters. Temporary passwords force a change on first login.
- Session cookies are httpOnly, SameSite, and Secure when served over HTTPS. Sessions rotate on login and expire after 8 hours of inactivity.
- CSRF tokens are required for state-changing requests. Login is rate-limited and temporarily locked after repeated failures.
- RBAC is enforced server-side on every endpoint. The UI hides unavailable actions but is never the security boundary.
- All SQL uses prepared statements. All output is escaped by React. Announcements are plain text, not HTML.
- Uploads are validated by extension, MIME type, and size; stored outside the web root; and served through authorized endpoints. Photos are limited to 2 MB and documents to 5 MB.
- CSV exports guard against formula injection by escaping leading formula characters.
- Financial and grading changes require Audit Entries. Published Report Cards and issued Invoices are immutable snapshots.
- Backup download and restore are restricted to the Super Admin and require explicit confirmation. Restore is refused while other writes are in progress.
- Errors do not leak stack traces or SQL in production. Detailed errors are written to a server-side log.

### Performance and operations

- Foreign keys, status columns, dates, and common search fields are indexed. List endpoints paginate; no endpoint returns an unbounded table.
- Dashboard aggregates use targeted queries rather than loading full tables. N+1 queries are avoided in list and profile responses.
- SQLite WAL supports concurrent readers. Writes are short and transactional. Long imports and invoice generation run in batches with progress reporting.
- The system is online-only over the LAN. There is no offline sync, service worker cache of school data, or background replication.
- Deployment supports XAMPP/Apache and PHP's built-in server. A `.htaccess` fallback routes SPA and API requests correctly; the built-in server uses a router script.
- The database, uploads, and backups live in a writable storage directory outside the web root. A health check reports database reachability, storage writability, and last backup time.
- The seed command creates a complete demo school: 12 Grade Levels, two Sections per grade, Afghan names, standard subjects, demo Users for every Role, sample attendance, exams, scores, invoices, payments, and library loans.
- The README covers setup on XAMPP and `php -S`, seeding, default logins, backup and restore, locale switching, and the test commands.

### Build order

1. Foundation: repository layout, design tokens, app shell, i18n and RTL, authentication, settings, migrations, seed skeleton.
2. Academic setup: years, semesters, grades, sections, subjects, departments, rooms, period grids, curriculum, timetable, holidays.
3. People: staff, students, guardians, applicants, admissions, enrollment, promotion, documents, CSV import/export.
4. Attendance: daily marking, summaries, corrections, locks.
5. Exams and results: schedules, mark entry, publication, supplementary exams, Report Cards, print views.
6. Finance: fee structures, monthly invoices, payments, discounts, refunds, credits, receipts, arrears.
7. Library: catalog, copies, loans, fines, overdue handling.
8. Portals, announcements, dashboards, audit UI, backup and restore, health check, polish, seed, smoke tests, README.

## Testing Decisions

### What makes a good test

A good test exercises **external behavior** at a stable seam, asserts what a user or API client can observe, and fails for one clear reason. Tests must not assert private methods, internal call order, component internals, or database implementation details. Each test starts from a known database state, uses a deterministic clock and timezone, and leaves no shared state behind. A test that only passes because of execution order is a bug.

### Primary seam: HTTP API integration

The highest-value seam is the real HTTP API against a real PHP server and a real SQLite database.

- Each test run starts the PHP server on an ephemeral port with a temporary database file and a compact fixture school.
- Tests use Node's built-in test runner and `fetch`; no Composer, PHPUnit, or extra API client dependency is required.
- Each test file gets an isolated database. Tests within a file reset fixtures between cases.
- The seam covers routing, middleware, authentication, CSRF, RBAC, validation, services, repositories, schema constraints, transactions, audit entries, and response shape.
- Domain rules are asserted through observable responses: exam score limits, Annual Subject Score, Overall Average, Letter Grade, rank, supplementary capping, promotion outcomes, attendance percentages, invoice balances, arrears, fine caps, and report-card snapshots.
- Permission tests sign in as each Role and assert 403 for forbidden actions, not just hidden UI.
- CSV import tests cover dry-run validation, row-level errors, and commit.
- Backup and restore tests use a disposable database and verify that a restore produces the expected observable state.
- Idempotency tests retry a Payment request and assert one Payment and one Receipt.

### Secondary seam: browser journeys

A small Playwright suite covers behavior that only exists when the SPA, API, and database are composed.

- Critical journeys only: login and first-password change, role-aware navigation, language switch with RTL, attendance grid, exam mark entry, report-card generation and print view, invoice generation and payment with receipt, library loan and return, and guardian child switching.
- The suite runs against the built SPA and a seeded test database. It uses stable accessible selectors, not CSS implementation classes.
- Locale tests assert document direction, translated navigation, mirrored layout, Eastern digits, and Solar Hijri date display.
- Print tests open the print view and assert the presence of the school header, student identity, score table, signatures, and locale-correct labels rather than pixel-perfect screenshots.
- Accessibility checks use axe on the login, dashboard, attendance, and mark-entry screens.
- Mobile viewport tests cover attendance and mark entry only.

### Modules tested

- Authentication, session handling, CSRF, rate limiting, and RBAC.
- School Settings and locale/calendar behavior.
- Academic structure, curriculum, period grids, timetable conflict detection.
- Student, Guardian, Staff, Applicant, Admission, Enrollment, and Promotion flows.
- Attendance marking, correction windows, month locks, and percentages.
- Exam scheduling, score entry, publication, supplementary exams, Annual Subject Score, Overall Average, Letter Grade, rank, and Report Card snapshots.
- Fee Structures, monthly Invoice generation, Payments, Discounts, Refunds, Credits, Receipts, Arrears, and idempotency.
- Library Titles, Copies, Loans, renewals, Fines, lost/damaged handling, and Invoice integration.
- Announcements and role-scoped portals.
- Audit Entries, backup/restore, CSV import/export, and health check.

### Prior art

The repository is greenfield, so there is no existing test suite. This spec establishes the conventions:

- API tests live at the HTTP seam and use a fixture school, not production seed data.
- Browser tests cover a deliberately small set of journeys; they do not duplicate every API case.
- Pure calculations are asserted through API responses. A separate unit seam is added only if a calculation becomes complex enough that API-level feedback is too slow or imprecise.
- There are no snapshot tests of rendered HTML and no assertions against internal class names.

### Test data

A compact fixture school: two Grade Levels, two Sections, six Subjects, ten Students, three Staff, four Guardians, two Teaching Assignments, one Fee Structure per grade, one library Title with three Copies, and one open Academic Year with two Semesters. Fixtures are created through seed helpers or direct SQL setup in a test-only bootstrap, never through the production seed command.

### Commands

- API tests: start the PHP test server and run the Node test runner.
- Browser tests: build the SPA, seed the test database, and run Playwright.
- Quality gates: frontend lint, production build, API test suite, and the critical browser suite.

## Out of Scope

- Transport, hostel/boarding, payroll, inventory, HR leave, and staff attendance.
- LMS or course content, assignments, quizzes, classwork, and continuous assessment.
- SMS and email gateways, password reset by email, and guardian–teacher messaging.
- Online payment gateways and card processing.
- Library reservations, barcode scanner hardware, and self-service issue/return.
- Biometric devices, document e-signing, and visitor management.
- Multi-year transcripts and transfer certificates.
- Multi-tenancy, multi-school hosting, and district-level reporting.
- Native mobile apps, offline sync, and background replication.
- Public online admission forms.
- General ledger, double-entry accounting, late fees, and invoice proration.
- Custom report builders and ad-hoc SQL access.
- Pixel-perfect visual regression testing.

## Further Notes

- **Test seams need confirmation.** The proposal is two seams: HTTP API integration as the primary seam, plus a small Playwright browser suite for critical journeys. No third seam unless a calculation earns one.
- **Issue tracker is not configured.** No tracker or triage vocabulary is available in this session, so this spec cannot yet be published or labeled `ready-for-agent`. The project owner should run `/setup-matt-pocock-skills` or provide the tracker and label vocabulary.
- **Placeholders to replace when available:** real school name, logo, and contact details; real subject list per Grade Level; real fee amounts, library limits, and fine amounts; existing student, guardian, staff, or historical-mark data for import.
- **No implementation has started.** The agreed contract lives in the shared-understanding document; the vocabulary lives in the glossary; hard-to-reverse technical choices live in the ADRs.
- **The two-exam rule is deliberate.** There is no classwork, quiz, assignment, or midterm model in v1, and the First Exam is marked out of 40 while the Final Exam is marked out of 60. Adding continuous assessment later is a domain change, not a UI change.
- **Published documents are snapshots.** Report Cards and Invoices must remain stable for guardians, auditors, and reprints even after source data changes.
