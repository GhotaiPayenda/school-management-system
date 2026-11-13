# 05: Grade Levels, Sections, and Rooms

**What to build:** A Registrar creates Grade Levels 1–12, Sections within a Grade Level for an Academic Year with a capacity, and Rooms. The records are editable and searchable, and duplicate identities are rejected.

**Blocked by:** 04 (Academic years and semesters)

**Status:** ready-for-agent

- [ ] A Registrar can create and edit Grade Levels with a unique number and name.
- [ ] A Registrar can create Sections per Grade Level and Academic Year with a unique name, such as 10-A, and a capacity.
- [ ] A Registrar can create, edit, and archive Rooms with a unique name and capacity.
- [ ] Lists support search, filtering, and pagination, and a Section shows its Grade Level, Academic Year, capacity, and current occupancy.
- [ ] Duplicate Grade Levels, duplicate Section names within a year, and duplicate Room names are rejected.
- [ ] API and browser tests cover creation, duplicates, validation, search, and permission denial.