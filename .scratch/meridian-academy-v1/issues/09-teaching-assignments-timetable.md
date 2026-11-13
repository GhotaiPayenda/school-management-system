# 09: Teaching Assignments and weekly Timetable

**What to build:** A Registrar assigns Teachers to Subjects and Sections, places Lessons into Periods, receives real-time Section, Teacher, and Room conflict errors based on actual start and end times, and views or prints the timetable by Section, Teacher, or Room.

**Blocked by:** 06 (Departments, Subjects, and Curriculum), 07 (Staff records, teacher accounts, and Homeroom assignment), 08 (Period grids, breaks, and holidays)

**Status:** ready-for-agent

- [ ] A Registrar can create Teaching Assignments linking one Teacher, Subject, Section, and Academic Year, and duplicate assignments are rejected.
- [ ] A Registrar can place a Lesson into a Period for a Section on a teaching day, choosing the assigned Subject and Teacher and an optional Room.
- [ ] Section, Teacher, and Room conflicts are rejected using real start and end times, including across Sections with different Period grids.
- [ ] Timetable views by Section, Teacher, and Room show the correct Lessons and Breaks.
- [ ] A print view produces a Section timetable with the school header, teaching days, Periods, Breaks, Subjects, Teachers, and Rooms.
- [ ] API and browser tests cover assignment duplication, all three conflict types, the three views, print data, and permission denial.