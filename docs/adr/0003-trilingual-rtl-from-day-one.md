# Trilingual, RTL-ready UI from day one

English is the default UI language, but Dari (`fa-AF`) and Pashto (`ps-AF`) must be switchable, and both are right-to-left. The UI is therefore built on logical CSS properties, every string lives in a locale catalog, and layout and icons are mirrored from the first component rather than retrofitted later.

**Considered options**: English-only first and RTL later — rejected because direction is baked into layout, spacing, icons, and print templates, so retrofitting it would touch every screen.

**Consequences**: no physical `left`/`right` utilities, two type systems (Latin and Arabic script), locale-formatted dates and digits with ISO/Gregorian storage, and print templates that must render in the active locale.
