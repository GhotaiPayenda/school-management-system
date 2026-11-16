# 05: Grade Levels, Sections, and Rooms

**What to build:** A Registrar creates Grade Levels 1–12, Sections within a Grade Level for an Academic Year with a capacity, and Rooms. The records are editable and searchable, and duplicate identities are rejected.

**Blocked by:** 04 (Academic years and semesters)

**Status:** done

- [x] A Registrar can create and edit Grade Levels with a unique number and name.
- [x] A Registrar can create Sections per Grade Level and Academic Year with a unique name, such as 10-A, and a capacity.
- [x] A Registrar can create, edit, and archive Rooms with a unique name and capacity.
- [x] Lists support search, filtering, and pagination, and a Section shows its Grade Level, Academic Year, capacity, and current occupancy.
- [x] Duplicate Grade Levels, duplicate Section names within a year, and duplicate Room names are rejected.
- [x] API and browser tests cover creation, duplicates, validation, search, and permission denial.

## Comments

- `AcademicController` implements Grade Levels, Sections, and Rooms with duplicate rejection, search, filtering, and pagination.
- Section rows expose grade, academic year, capacity, and occupancy from active enrollments; Rooms support archiving.
- `AcademicPage` edits all three entities; API and browser journeys exercise the academic module.
