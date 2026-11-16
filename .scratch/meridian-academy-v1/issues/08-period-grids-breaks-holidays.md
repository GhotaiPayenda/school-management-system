# 08: Period grids, breaks, and holidays

**What to build:** A Registrar configures each Section's daily structure — start time, Period count, duration, and Breaks — and adds Holidays to the Academic Year. The timetable structure view shows the resulting day, and invalid or overlapping times are rejected.

**Blocked by:** 05 (Grade Levels, Sections, and Rooms)

**Status:** done

- [x] A Registrar can set a Section's start time, Period count, and Period duration, and each Section's grid is independent of other Sections.
- [x] Periods within a Section cannot overlap, and start and end times must be coherent.
- [x] A Registrar can add one or more Breaks between Periods, and Breaks appear in the day structure without counting as teaching Periods.
- [x] A Registrar can add Holidays with a date and label inside the Academic Year; duplicate dates are rejected.
- [x] The timetable structure view shows Periods and Breaks for a Section in order.
- [x] API and browser tests cover independent grids, overlaps, Breaks, Holiday duplicates, and permission denial.

## Comments

- `TimetableController::saveGrid` stores independent section grids with coherent start/end times, overlap rejection, and break rows that do not count as teaching periods.
- Holidays are handled by `AcademicController` with duplicate-date rejection; the period-grid modal exposes start time, period count, and minutes per period.
- The timetable UI and print sheet render periods and breaks in order.
