# Meridian Academy

A single-school K-12 management system covering academics, people, finance, and library. The glossary fixes the vocabulary used across the API, database, and UI so that overloaded school words have exactly one meaning.

## Academic structure

**Academic Year**:
The annual enrollment cycle, containing two Semesters.
_Avoid_: session, school year

**Semester**:
One of the two divisions of an Academic Year; the first ends with the First Exam and the second ends with the Final Exam.
_Avoid_: term

**Grade Level**:
A year of study from Grade 1 to Grade 12, which defines the curriculum and the fee structure.
_Avoid_: grade, class, year

**Section**:
A cohort of Students within one Grade Level for one Academic Year, such as 10-A, with a homeroom teacher and a capacity.
_Avoid_: class, division

**Class**:
The human-readable label for a Section, such as "Class 10-A"; it never means a scheduled lesson.
_Avoid_: using it for a Lesson

**Subject**:
A taught discipline, such as Mathematics or Dari, belonging to one Department.
_Avoid_: course

**Department**:
An academic grouping of related Subjects, such as Science or Languages; not an administrative office.
_Avoid_: faculty, office

**Period**:
A time slot in a Section's daily timetable, with an order, start time, and duration; Sections may use different period grids.
_Avoid_: lesson, slot

**Lesson**:
The assignment of one Subject to one Period for one Section.
_Avoid_: class, period

**Break**:
A non-teaching gap between Periods in a Section's day.
_Avoid_: recess

**Timetable**:
The weekly grid of Periods and Lessons for a Section, Teacher, or Room.
_Avoid_: schedule

**Room**:
A physical space where Lessons take place.
_Avoid_: classroom

**Teaching Assignment**:
The assignment of one Teacher to teach one Subject to one Section for one Academic Year.
_Avoid_: allocation

**Homeroom Teacher**:
The Teacher accountable for a Section's attendance and pastoral care.
_Avoid_: class teacher

## People and access

**Student**:
A person receiving instruction at the school, currently or formerly.
_Avoid_: pupil, learner

**Guardian**:
A person responsible for a Student, with a stated relationship and a primary-contact flag.
_Avoid_: parent

**Staff**:
Any person employed by the school.
_Avoid_: employee

**Teacher**:
A Staff member who delivers Lessons; not every Staff member is a Teacher.
_Avoid_: faculty

**User**:
A login identity linked to exactly one Staff, Student, or Guardian.
_Avoid_: account

**Role**:
A named bundle of Permissions assigned to a User.
_Avoid_: user type

**Permission**:
A single allowed action, such as recording a Payment.
_Avoid_: privilege, right

**Applicant**:
A person seeking Admission who is not yet a Student.
_Avoid_: candidate

**Admission**:
The decision and process that accepts an Applicant and creates a Student.
_Avoid_: enrollment, registration

**Enrollment**:
The link placing a Student in a Section for one Academic Year, carrying a status such as active, transferred, withdrawn, or graduated.
_Avoid_: registration, admission

**Promotion**:
The end-of-year act of moving a Student to the next Grade Level and creating a new Enrollment.
_Avoid_: upgrade, rollover

**Retention**:
A Student repeating the same Grade Level in a new Academic Year.
_Avoid_: repetition

## Attendance and assessment

**Attendance Record**:
The status of one Student in one Section on one date: present, absent, late, or excused.
_Avoid_: roll call

**Exam**:
A formally scheduled, scored event at the end of a Semester; each Subject has exactly two Exams per Academic Year.
_Avoid_: test, assessment

**First Exam**:
The Semester 1 Exam for a Subject, scored out of 40 points.
_Avoid_: midterm, semester exam

**Final Exam**:
The Semester 2 Exam for a Subject, scored out of 60 points; it is also that Subject's final examination for the year.
_Avoid_: annual exam

**Exam Schedule**:
The dated sequence of Exams for a Section, with start time, duration, and Room.
_Avoid_: exam timetable

**Exam Score**:
The points a Student earns on one Exam.
_Avoid_: mark, grade

**Annual Subject Score**:
The sum of a Student's First Exam Score and Final Exam Score for one Subject, out of 100.
_Avoid_: final score, final mark

**Overall Average**:
The arithmetic mean of a Student's Annual Subject Scores across all Subjects.
_Avoid_: final average

**Letter Grade**:
The label derived from the Overall Average: A at 90 and above, B at 80, C at 70, D at 40, and Fail below 40.
_Avoid_: final grade

**Subject Result**:
The Annual Subject Score for one Subject together with its pass or fail status.
_Avoid_: grade, mark

**Supplementary Exam**:
An additional Exam for a Student whose Annual Subject Score is below 40, used to decide whether the Subject is passed.
_Avoid_: retake, re-sit

**Semester Report Card**:
The published summary of a Student's First Exam Scores, attendance, and rank at the end of Semester 1.
_Avoid_: progress report

**Annual Report Card**:
The published summary of a Student's two Exam Scores, Subject Results, Overall Average, Letter Grade, attendance, and rank for an Academic Year.
_Avoid_: final report

**Report Card**:
The umbrella term for a Semester Report Card or an Annual Report Card.
_Avoid_: transcript

## Finance

**Fee Structure**:
The set of Fee Components and amounts charged to a Grade Level for a Billing Period, Semester, or Academic Year.
_Avoid_: fee plan

**Fee Component**:
A single named charge, such as tuition, admission, or exam.
_Avoid_: fee item

**Billing Period**:
One calendar month for which recurring Fee Components are invoiced.
_Avoid_: cycle, billing cycle

**Invoice**:
A demand for payment issued to a Student or Guardian for specific Fee Components.
_Avoid_: bill

**Payment**:
Money actually received against an Invoice; several partial Payments may settle one Invoice.
_Avoid_: transaction

**Receipt**:
The document proving a Payment.
_Avoid_: invoice

**Discount**:
A reduction applied to an Invoice, such as a scholarship, sibling, or staff discount.
_Avoid_: concession

**Arrears**:
The unpaid balance of an Invoice past its due date.
_Avoid_: debt

**Refund**:
The return of a previously received Payment.
_Avoid_: reversal

## Library

**Title**:
A bibliographic work in the library catalog.
_Avoid_: book

**Copy**:
One physical, individually accession-numbered instance of a Title.
_Avoid_: book, item

**Loan**:
The lending of one Copy to a Student or Staff member for a period.
_Avoid_: issue

**Fine**:
A charge for a late return, damaged Copy, or lost Copy.
_Avoid_: penalty

## Platform

**School Settings**:
The single record holding school identity, currency, timezone, calendar, and policy defaults.
_Avoid_: config

**Announcement**:
A message published to selected audiences, such as all staff or one Section.
_Avoid_: notice, broadcast

**Audit Entry**:
An immutable record of a privileged action: who did what, when, and to which record.
_Avoid_: log
