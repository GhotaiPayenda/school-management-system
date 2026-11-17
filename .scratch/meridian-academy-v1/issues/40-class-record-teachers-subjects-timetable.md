# 40: Class record — Teachers, Subjects, and Timetable panels

**What to build:** The class record shows the Teachers who work in this Section, grouped by Teacher and paired with the Subjects they teach, with the Homeroom Teacher pinned first and badged. The Subjects panel lists the full Grade Level curriculum for the Academic Year and marks each Subject with its Teacher or as **Unassigned**, offering a management link for Roles that can fix it. The Timetable panel renders the Section's weekly grid with Periods, Lessons, Subject, Teacher, and Room, respecting the school's teaching days.

**Blocked by:** 39 (Class record — header, year switcher, and roster)

**Status:** ready-for-agent

- [ ] The profile response includes Teachers grouped from Teaching Assignments with a Homeroom flag and their Subjects, the full curriculum with weekly Periods, elective flag, and assigned Teacher or null, and the Timetable grid in the existing Section timetable shape with Periods, Lessons by day, and teaching days.
- [ ] A Subject in the Grade Level curriculum with no Teaching Assignment for this Section is reported as Unassigned; removing one Teaching Assignment in the Seed or test fixture changes the count and the panel.
- [ ] The Teachers panel pins the Homeroom Teacher first, badges the role, groups multiple Subjects under one Teacher, and does not duplicate a Teacher with two Subjects.
- [ ] The Subjects panel shows every curriculum Subject, its weekly Periods, and its Teacher or **Unassigned**, and links to the Timetable and Teaching Assignments screens only for Roles holding `academic.manage`.
- [ ] The Timetable panel renders the weekly grid with Periods, Lessons, Subject, Teacher, and Room, uses the school's teaching days, and mirrors correctly in RTL.
- [ ] Empty states distinguish a Section with no Period grid from a configured grid with no Lessons, and a Section with no Teaching Assignments from one with no curriculum.
- [ ] API tests cover grouped Teachers, the Homeroom flag, Unassigned counts, curriculum completeness, and grid shape; the browser journey asserts the three panels and their empty states.
- [ ] All new labels exist in English, Dari, and Pashto with Eastern digits and Solar Hijri dates; the i18n completeness check reports zero missing keys.

## Comments
