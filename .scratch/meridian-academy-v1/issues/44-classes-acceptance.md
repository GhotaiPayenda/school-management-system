# 44: Classes acceptance pass

**What to build:** The Classes area is verified end to end across every Role, language, and theme, with the v1 spec, README, and Glossary updated and every quality gate green. The new sixth browser journey covers the list, a full class record, and the print sheet, while the existing five journeys and all print surfaces continue to pass.

**Blocked by:** 43 (Print class profile)

**Status:** ready-for-agent

- [ ] A super-admin, principal, registrar, teacher, accountant, and librarian can each open Classes and see exactly what their Permissions allow; a student and a guardian cannot reach the area.
- [ ] A Teacher's list and record access are limited to Sections where they are Homeroom Teacher or hold a Teaching Assignment.
- [ ] The additional browser journey covers sidebar entry, grouped cards, a full class record, and the print sheet, and the suite runs serially against a freshly rebuilt test database.
- [ ] All existing journeys still pass, including the print surfaces for timetables, exam schedules, report cards, receipts, ID cards, and class lists.
- [ ] `docs/specs/meridian-academy-v1.md` gains the Classes read model section, `README.md` documents the area and the new Permission including the re-seed step, and `GLOSSARY.md` matches the shipped vocabulary.
- [ ] PHP lint, the API suite, the production build, the i18n completeness check, and the full browser suite all pass.
- [ ] No existing endpoint changes behaviour except the `pageSize` pagination alias, and no schema change is introduced.
- [ ] Tickets 38–43 are closed with checked criteria and implementation comments.

## Comments
