# 43: Print class profile

**What to build:** One **Print class profile** action on the class record produces a single sheet with the school header, class identity, roster, Teachers and Subjects, weekly Timetable, Attendance summary, and Results summary. While the print dialog is open the application shell is hidden so only the document reaches the printer. The sheet follows the active language, direction, digits, and calendar, and the existing class-list print is unchanged.

**Blocked by:** 42 (Class record — Results panel)

**Status:** done

- [x] The class record offers a Print class profile action visible to every Role that can open the record.
- [x] The printed sheet contains the school header, class identity with Homeroom Teacher, roster, Teachers and Subjects, weekly Timetable, Attendance summary, and Results summary.
- [x] Opening the print dialog hides the sidebar, topbar, and page chrome; closing it restores the application.
- [x] The sheet honours the active language and direction, uses Eastern digits and Solar Hijri dates where the locale requires them, and uses the school identity from Settings.
- [x] Panels the viewer cannot read, such as Attendance or Results without permission, are omitted from the sheet instead of printing a permission message.
- [x] The browser suite asserts the print sheet's sections and the shell-hiding behaviour, and the existing timetable, exam schedule, report card, receipt, ID card, and class-list print surfaces still pass.
- [x] The print layout works in light and dark mode without relying on screen-only colours for text.
- [x] All new print labels exist in English, Dari, and Pashto; the i18n completeness check reports zero missing keys.

## Comments

- The class record now opens a print preview with the school header, identity, roster, Teachers and Subjects, Timetable, Attendance summary, and Results summary.
- `usePrintMode` hides the application shell while the sheet is open, and the sheet is localized and RTL-aware.
- The print journey asserts the sheet and shell-hiding behaviour; the existing print surfaces still pass.
