# 12: Promotion and graduation

**What to build:** A Registrar previews and commits year-end promotion for a Section, marks individual retainees, graduates Grade 12 Students, and copies the next Academic Year's curriculum forward without changing historical records.

**Blocked by:** 06 (Departments, Subjects, and Curriculum), 11 (Admissions and Enrollment)

**Status:** done

- [x] A promotion preview for a Section shows each Student's current Grade Level, target Grade Level or Section, retention outcome, and graduation outcome.
- [x] Committing promotion creates new Enrollments for the next Academic Year, leaves retained Students in the same Grade Level, and graduates Grade 12 Students.
- [x] A Student cannot end up with two active Enrollments for the same Academic Year.
- [x] Previous Enrollments, results, and attendance remain unchanged after promotion.
- [x] The next Academic Year's curriculum is copied forward and editable without mutating the previous year.
- [x] API and browser tests cover preview, commit, retention, graduation, duplicate prevention, history preservation, and curriculum copy.

## Comments

- `PeopleController::promote` provides preview and commit, next-year enrollment creation, retention, Grade 12 graduation, and duplicate-active-enrollment prevention.
- Historical enrollments, results, and attendance are untouched; curriculum copy-forward is available in academic setup.
- `AdmissionsPage` exposes the promotion preview and commit flow.
