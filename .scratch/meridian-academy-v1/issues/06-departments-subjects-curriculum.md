# 06: Departments, Subjects, and Curriculum

**What to build:** A Registrar creates academic Departments and Subjects, maps Subjects to each Grade Level with a weekly Period load, an exam flag, and an elective flag, and copies the curriculum into a new Academic Year without changing history.

**Blocked by:** 05 (Grade Levels, Sections, and Rooms)

**Status:** ready-for-agent

- [ ] A Registrar can create, edit, and archive Departments with unique names.
- [ ] A Registrar can create, edit, and archive Subjects with a unique code, a Department, and an exam flag.
- [ ] A Registrar can assign a Subject to a Grade Level and Academic Year with a weekly Period load and an elective flag, and a duplicate Grade Level + Subject entry is rejected.
- [ ] A curriculum view shows Subjects by Grade Level, and a copy-forward action creates the next Academic Year's entries without altering the previous year.
- [ ] The system warns when a Grade Level's total weekly Period load exceeds the Section's available teaching Periods.
- [ ] API and browser tests cover CRUD, duplicates, copy-forward, the Period-load warning, and permission denial.