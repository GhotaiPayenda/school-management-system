# 08: Period grids, breaks, and holidays

**What to build:** A Registrar configures each Section's daily structure — start time, Period count, duration, and Breaks — and adds Holidays to the Academic Year. The timetable structure view shows the resulting day, and invalid or overlapping times are rejected.

**Blocked by:** 05 (Grade Levels, Sections, and Rooms)

**Status:** ready-for-agent

- [ ] A Registrar can set a Section's start time, Period count, and Period duration, and each Section's grid is independent of other Sections.
- [ ] Periods within a Section cannot overlap, and start and end times must be coherent.
- [ ] A Registrar can add one or more Breaks between Periods, and Breaks appear in the day structure without counting as teaching Periods.
- [ ] A Registrar can add Holidays with a date and label inside the Academic Year; duplicate dates are rejected.
- [ ] The timetable structure view shows Periods and Breaks for a Section in order.
- [ ] API and browser tests cover independent grids, overlaps, Breaks, Holiday duplicates, and permission denial.