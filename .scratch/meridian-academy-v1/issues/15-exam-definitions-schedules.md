# 15: Exam definitions and schedules

**What to build:** A Registrar creates exactly one First Exam marked out of 40 and one Final Exam marked out of 60 for each Subject and Academic Year, schedules each Section's Exams with date, start time, duration, and Room, rejects Section, Teacher, and Room conflicts, and prints the Exam Schedule.

**Blocked by:** 05 (Grade Levels, Sections, and Rooms), 11 (Admissions and Enrollment)

**Status:** done

- [x] A Registrar can create a First Exam and a Final Exam for each Subject and Academic Year, with fixed maximum scores of 40 and 60.
- [x] A second First Exam or second Final Exam for the same Subject and year is rejected.
- [x] A Registrar can schedule an Exam for a Section with date, start time, duration, and Room.
- [x] Section, Teacher, and Room conflicts are rejected using real start and end times, and an Exam cannot be scheduled on a Holiday or outside its Semester.
- [x] Exam schedules can be listed by Section and date, and a print view includes the school header, Subject, date, time, duration, and Room.
- [x] API and browser tests cover duplicate Exams, score maxima, schedule conflicts, Holiday rejection, print data, and permission denial.

## Comments

- `ExamController` enforces one First Exam (/40) and one Final Exam (/60) per subject/year, plus schedule conflicts, holidays, semester bounds, duration, and room handling.
- `ExamsPage` provides exam definitions and schedules, with a printed schedule including school header, subject, date, start/end time, section, room, and duration.
- The print-surface browser journey verifies the rendered exam schedule.
