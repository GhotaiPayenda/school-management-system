# 42: Class record — Results panel

**What to build:** The class record shows the Section's published Results. Class-level indicators cover the class average, pass rate, Students with failed Subjects, and Retention count. Each Student row shows Overall Average, Letter Grade, failed Subject count, pass status, and Retention status, and expands into per-Subject detail with First Exam, Final Exam, Supplementary Exam where present, Annual Subject Score, Letter Grade, and pass or fail. Unpublished Exam Scores read **Pending**, never zero. Roles without `exams.view` see a permission message instead of a failing page.

**Blocked by:** 41 (Class record — Attendance panel)

**Status:** done

- [x] The Results panel reuses the existing Section results read model and introduces no new grading arithmetic.
- [x] Class indicators show the class average, pass rate, Students with at least one failed Subject, and Retention count, matching the underlying rows.
- [x] Each Student row shows Overall Average, Letter Grade, failed Subject count, pass status, and Retention status.
- [x] Expanding a row shows every Subject with First Exam, Final Exam, Supplementary Exam where present, Annual Subject Score, Letter Grade, and pass or fail.
- [x] An unpublished Exam Score renders as **Pending**; a missing score is never displayed as zero.
- [x] A Section with no published Results shows a true empty state, distinct from loading and from a permission message.
- [x] Roles without `exams.view` see a permission message and the rest of the record stays usable; the server refuses the underlying request.
- [x] Tests cover the indicators, the row and expansion data, pending scores, the empty state, and the permission matrix.
- [x] All new labels exist in English, Dari, and Pashto with Eastern digits and Solar Hijri dates; the i18n completeness check reports zero missing keys.

## Comments

- The Results panel reuses the existing Section results read model and adds class KPIs, per-Student rows, expandable Subject detail, Pending and Absent handling, and permission gating.
- No grading arithmetic or API endpoint was added.
