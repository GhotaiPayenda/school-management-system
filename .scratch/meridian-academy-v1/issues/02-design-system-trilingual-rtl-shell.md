# 02: Design system and trilingual RTL shell

**What to build:** The premium application shell is built on shared design tokens and supports English, Dari, and Pashto, true RTL mirroring, light and dark themes, locale persistence, Eastern Arabic-Indic digits, and Solar Hijri versus Gregorian date presentation. The shell is the visual foundation every later screen uses.

**Blocked by:** 01 (Walking skeleton: login, roles, and empty dashboard)

**Status:** ready-for-agent

- [ ] Design tokens define color, typography, spacing, radii, and shadows for light and dark themes, and shared components consume them rather than hardcoded values.
- [ ] Switching between English, Dari, and Pashto changes all shell labels and persists per User across reloads.
- [ ] Dari and Pashto set the document to RTL, mirror navigation and layout, and use Arabic-script fonts; English remains LTR.
- [ ] Dates and digits render as Solar Hijri and Eastern Arabic-Indic for Dari and Pashto, and Gregorian and Western digits for English, while storage remains ISO and Gregorian.
- [ ] No shell label is hardcoded in a component; the three locale catalogs contain every key.
- [ ] Browser tests assert direction, translated navigation, locale persistence, theme switching, and locale-aware date and digit output.