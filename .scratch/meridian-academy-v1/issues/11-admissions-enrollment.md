# 11: Admissions and Enrollment

**What to build:** A Registrar creates an Applicant, admits them into a Section, bulk-enrolls Students, transfers a Student between Sections, withdraws or transfers out, re-admits a former Student, and sees the full Enrollment history with capacity warnings.

**Blocked by:** 05 (Grade Levels, Sections, and Rooms), 10 (Students, Guardians, and documents)

**Status:** ready-for-agent

- [ ] A Registrar can create, edit, and list Applicants without creating a Student record.
- [ ] Admitting an Applicant creates the Student and first Enrollment in a chosen Section, and the Applicant records the admission decision.
- [ ] A Registrar can bulk-enroll existing Students into a Section, and duplicate active Enrollments for the same Student and Academic Year are rejected.
- [ ] A mid-year Section transfer closes the old Enrollment and creates the new one while preserving history.
- [ ] Withdrawal, transfer-out, and re-admission each move the Student through the correct Enrollment status, and re-admission creates a new Enrollment rather than reviving the old one.
- [ ] Enrolling into a Section over capacity produces a warning, and the Student profile shows every Enrollment in order.
- [ ] API and browser tests cover admission, bulk enrollment, duplicate rejection, transfer, withdrawal, re-admission, capacity warnings, and permission denial.