# 15: Exam definitions and schedules

**What to build:** A Registrar creates exactly one First Exam marked out of 40 and one Final Exam marked out of 60 for each Subject and Academic Year, schedules each Section's Exams with date, start time, duration, and Room, rejects Section, Teacher, and Room conflicts, and prints the Exam Schedule.

**Blocked by:** 05 (Grade Levels, Sections, and Rooms), 11 (Admissions and Enrollment)

**Status:** ready-for-agent

- [ ] A Registrar can create a First Exam and a Final Exam for each Subject and Academic Year, with fixed maximum scores of 40 and 60.
- [ ] A second First Exam or second Final Exam for the same Subject and year is rejected.
- [ ] A Registrar can schedule an Exam for a Section with date, start time, duration, and Room.
- [ ] Section, Teacher, and Room conflicts are rejected using real start and end times, and an Exam cannot be scheduled on a Holiday or outside its Semester.
- [ ] Exam schedules can be listed by Section and date, and a print view includes the school header, Subject, date, time, duration, and Room.
- [ ] API and browser tests cover duplicate Exams, score maxima, schedule conflicts, Holiday rejection, print data, and permission denial.