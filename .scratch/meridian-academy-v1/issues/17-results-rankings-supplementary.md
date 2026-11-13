# 17: Results, rankings, and Supplementary Exams

**What to build:** The system calculates Annual Subject Scores, Overall Average, Letter Grade, Subject pass or fail, and Section rank; flags Subjects below 40; supports a Supplementary Exam capped at 40; and records Retention when a Subject remains below 40.

**Blocked by:** 16 (Exam score entry and publication)

**Status:** ready-for-agent

- [ ] Annual Subject Score equals First Exam Score + Final Exam Score, out of 100, for every Subject.
- [ ] Overall Average is the equal-weight mean of all Annual Subject Scores, and Letter Grade follows A at 90+, B at 80+, C at 70+, D at 40+, and Fail below 40.
- [ ] Subject Results pass at 40 or above, and every Subject below 40 is flagged for Supplementary Exam.
- [ ] Section rank is computed from Overall Average, descending, with ties sharing a rank and the next rank skipping.
- [ ] A Supplementary Exam score is entered out of 100, capped at 40 for the Annual Subject Score, and cannot raise the Letter Grade above D.
- [ ] A Subject still below 40 after the Supplementary Exam marks the Student for Retention.
- [ ] A results view by Section and Subject shows First Exam, Final Exam, Annual Subject Score, pass/fail, Overall Average, Letter Grade, and rank, with CSV export.
- [ ] API and browser tests cover the arithmetic, exact grade boundaries, ties, caps, retention, and export.