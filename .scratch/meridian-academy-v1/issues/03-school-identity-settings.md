# 03: School identity and settings

**What to build:** A Super Admin edits the school's identity and operating defaults: name, logo, contact details, currency, timezone, teaching days, default language, and theme. The changes appear across the application shell and printed document headers.

**Blocked by:** 02 (Design system and trilingual RTL shell)

**Status:** ready-for-agent

- [ ] A Super Admin can view and update all School Settings fields, and the changes persist.
- [ ] The logo upload validates file type and size, displays in the shell and print header, and can be replaced or removed.
- [ ] Currency, timezone, teaching days, and default language are validated and affect displays elsewhere.
- [ ] A non-admin User receives 403 from the settings API and cannot open the settings screen.
- [ ] API and browser tests cover update, validation, logo upload, persistence, and permission denial.