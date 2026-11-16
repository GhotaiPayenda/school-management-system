# 09: Teaching Assignments and weekly Timetable

**What to build:** A Registrar assigns Teachers to Subjects and Sections, places Lessons into Periods, receives real-time Section, Teacher, and Room conflict errors based on actual start and end times, and views or prints the timetable by Section, Teacher, or Room.

**Blocked by:** 06 (Departments, Subjects, and Curriculum), 07 (Staff records, teacher accounts, and Homeroom assignment), 08 (Period grids, breaks, and holidays)

**Status:** done

- [x] A Registrar can create Teaching Assignments linking one Teacher, Subject, Section, and Academic Year, and duplicate assignments are rejected.
- [x] A Registrar can place a Lesson into a Period for a Section on a teaching day, choosing the assigned Subject and Teacher and an optional Room.
- [x] Section, Teacher, and Room conflicts are rejected using real start and end times, including across Sections with different Period grids.
- [x] Timetable views by Section, Teacher, and Room show the correct Lessons and Breaks.
- [x] A print view produces a Section timetable with the school header, teaching days, Periods, Breaks, Subjects, Teachers, and Rooms.
- [x] API and browser tests cover assignment duplication, all three conflict types, the three views, print data, and permission denial.

## Comments

- Teaching Assignments and Lessons are implemented with duplicate-assignment rejection and section/teacher/room conflict checks using real start and end times (`TimetableController::assertNoLessonConflicts`).
- Section, teacher, and room timetable endpoints exist, and the section grid shows periods, breaks, subjects, teachers, and rooms.
- A dedicated print sheet renders the section timetable with the school header; the print-surface browser journey verifies the sheet data.
