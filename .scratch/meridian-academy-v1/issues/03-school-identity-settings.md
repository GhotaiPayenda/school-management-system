# 03: School identity and settings

**What to build:** A Super Admin edits the school's identity and operating defaults: name, logo, contact details, currency, timezone, teaching days, default language, and theme. The changes appear across the application shell and printed document headers.

**Blocked by:** 02 (Design system and trilingual RTL shell)

**Status:** done

- [x] A Super Admin can view and update all School Settings fields, and the changes persist.
- [x] The logo upload validates file type and size, displays in the shell and print header, and can be replaced or removed.
- [x] Currency, timezone, teaching days, and default language are validated and affect displays elsewhere.
- [x] A non-admin User receives 403 from the settings API and cannot open the settings screen.
- [x] API and browser tests cover update, validation, logo upload, persistence, and permission denial.

## Comments

- `SettingsController` exposes `GET/PUT /api/v1/settings` and logo upload/removal at `/settings/logo`, with validation for name, currency, timezone, teaching days, language, theme, and calendar.
- `SettingsPage` edits identity, contact details, defaults, and logo. `GET /settings/summary` feeds the shell, print headers, and dashboard identity.
- A non-admin receives 403 from the settings API and cannot reach the Settings route; the API suite exercises the settings surface and role isolation.
