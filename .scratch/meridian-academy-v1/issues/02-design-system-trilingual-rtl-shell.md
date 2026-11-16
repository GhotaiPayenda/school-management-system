# 02: Design system and trilingual RTL shell

**What to build:** The premium application shell is built on shared design tokens and supports English, Dari, and Pashto, true RTL mirroring, light and dark themes, locale persistence, Eastern Arabic-Indic digits, and Solar Hijri versus Gregorian date presentation. The shell is the visual foundation every later screen uses.

**Blocked by:** 01 (Walking skeleton: login, roles, and empty dashboard)

**Status:** done

- [x] Design tokens define color, typography, spacing, radii, and shadows for light and dark themes, and shared components consume them rather than hardcoded values.
- [x] Switching between English, Dari, and Pashto changes all shell labels and persists per User across reloads.
- [x] Dari and Pashto set the document to RTL, mirror navigation and layout, and use Arabic-script fonts; English remains LTR.
- [x] Dates and digits render as Solar Hijri and Eastern Arabic-Indic for Dari and Pashto, and Gregorian and Western digits for English, while storage remains ISO and Gregorian.
- [x] No shell label is hardcoded in a component; the three locale catalogs contain every key.
- [x] Browser tests assert direction, translated navigation, locale persistence, theme switching, and locale-aware date and digit output.

## Comments

- Design tokens, component styles, print styles, RTL logical properties, and light/dark themes live in `web/src/styles/app.css`; shared primitives consume them.
- `web/src/i18n/dictionary.js` is a flat-key English/Dari/Pashto catalog consumed with `keySeparator: false`; `storage/check-i18n.mjs` reports 0 missing entries.
- `fa-AF` and `ps-AF` set `dir="rtl"`, swap to Arabic-script fonts, and render Persian-calendar dates with Eastern digits through `web/src/lib/format.js`. Language and theme persist in `meridian.language` and `meridian.theme`.
- The Playwright journey "the shell switches language, RTL, digits, and theme, and persists them" verifies direction, translated navigation, both themes, persistence, and locale-aware output.
