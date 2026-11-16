# 16: Exam score entry and publication

**What to build:** A Subject Teacher enters whole-number First and Final Exam scores for assigned Sections, saves drafts, marks absence and makeup, and an Admin sets marking deadlines, reviews, publishes, locks, and unlocks with an audited reason.

**Blocked by:** 15 (Exam definitions and schedules)

**Status:** done

- [x] A Subject Teacher can enter whole-number First Exam scores from 0 to 40 and Final Exam scores from 0 to 60 for assigned Sections.
- [x] Out-of-range scores, fractional scores, and Students outside the Section are rejected with field-level errors.
- [x] Scores can be saved as a draft and resumed later without becoming visible to Students or Guardians.
- [x] A Teacher can mark a Student absent for an Exam instead of entering zero, and can record a makeup score for an excused absence.
- [x] A marking deadline set by an Admin blocks new or changed scores after the deadline.
- [x] An Admin can publish scores, after which they are locked; unlocking requires a written reason and creates an Audit Entry.
- [x] A Subject Teacher cannot edit another Teacher's Section or Subject, and cannot edit after publication.
- [x] API and browser tests cover ranges, drafts, absence, makeup, deadlines, publish, lock, unlock, and permission denial.

## Comments

- `ExamController` implements score entry, whole-number ranges, draft save/resume, absence/makeup, marking deadlines, publication lock, and reasoned unlock with audit.
- Subject-teacher ownership and post-publication immutability are enforced server-side; Admins publish and unlock.
- `ExamsPage` provides the score grid, draft, publish, and unlock flows.
