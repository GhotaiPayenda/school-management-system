# 18: Semester and Annual Report Cards

**What to build:** An Admin batch-generates Semester and Annual Report Cards for a Section, Homeroom Teachers add remarks, the Admin publishes and reissues them, and Students, Guardians, and print views see the correct locale, attendance, rank, and signatures.

**Blocked by:** 02 (Design system and trilingual RTL shell), 14 (Attendance corrections, month locks, and per-Period mode), 17 (Results, rankings, and Supplementary Exams)

**Status:** done

- [x] An Admin can generate Semester Report Cards for a whole Section in one action, containing each Student's First Exam Scores out of 40, total, percentage, attendance, and rank.
- [x] An Admin can generate Annual Report Cards for a whole Section, containing First Exam, Final Exam, Annual Subject Score, Subject pass/fail, Overall Average, Letter Grade, rank, attendance, Homeroom remark, and principal signature.
- [x] Published Report Cards snapshot their values; later score or attendance changes do not alter an already published document.
- [x] A Homeroom Teacher can add a remark before publication, and only the Admin can publish.
- [x] Published Report Cards are visible to the Student and their Guardians, and unpublished ones are not.
- [x] The print view includes school identity, Student photo, the score table, totals, attendance, rank, remarks, and signature lines in the active locale with correct digits and dates.
- [x] Reissuing after a correction creates a new version while retaining the previous version.
- [x] API and browser tests cover batch generation, snapshot immutability, publication visibility, print data, locale output, and reissue.

## Comments

- `ExamController` batch-generates semester and annual report cards with immutable published snapshots, remarks, attendance, rank, principal signature, publication visibility, and versioned reissue.
- `ResultsPage` and `PortalReportsPage` render the localized print sheet with school identity, scores, totals, attendance, rank, remarks, and signatures.
- Report-card printing is verified in the print-surface browser journey; snapshots are asserted by the API suite.
