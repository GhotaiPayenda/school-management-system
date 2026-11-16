# Browser smoke tests (secondary seam)

The API suite in `tests/api` is the hard quality gate. These Playwright journeys
cover the composed browser experience and are opt-in because they need a
disposable database plus running API and SPA servers.

## One-time setup

```powershell
npm --prefix web install
npm --prefix web exec -- playwright install chromium
```

## Run the suite against a throwaway database

```powershell
$env:MERIDIAN_DB_PATH = "$PWD\storage\e2e.sqlite"
$env:MERIDIAN_STORAGE_PATH = "$PWD\storage\e2e-storage"
php scripts/db.php fresh --database="$env:MERIDIAN_DB_PATH" --storage="$env:MERIDIAN_STORAGE_PATH"

# Terminal 1: API on 8000
php -S 127.0.0.1:8000 -t api/public api/public/router.php

# Terminal 2: Vite dev server, proxying /api to 8000
npm --prefix web run dev

# Terminal 3
$env:MERIDIAN_E2E = "1"
npm run test:e2e
```

The demo seeder creates every account the suite needs. The defaults are:

| Role      | Email                             | Password        |
| --------- | --------------------------------- | --------------- |
| Admin     | `admin@meridian.academy`          | `Meridian@2026` |
| Teacher   | `teacher.demo@meridian.academy`   | `Meridian@2026` |
| Guardian  | `guardian.demo@meridian.academy`  | `Meridian@2026` |

Override them with `MERIDIAN_E2E_ADMIN_EMAIL`, `MERIDIAN_E2E_TEMP_PASSWORD`,
`MERIDIAN_E2E_NEW_PASSWORD`, `MERIDIAN_E2E_TEACHER_EMAIL`,
`MERIDIAN_E2E_TEACHER_PASSWORD`, `MERIDIAN_E2E_GUARDIAN_EMAIL`, and
`MERIDIAN_E2E_GUARDIAN_PASSWORD`.

## Journeys

1. Super Admin signs in, is forced to change the temporary password, opens every
   staff module, and logs out.
2. Printable timetable, exam schedule, report card, receipt, ID card, and class
   list sheets render with the school header.
3. A Teacher cannot open the Roles screen.
4. The shell switches language and theme, preserves both across reloads, sets
   RTL for Dari and Pashto, and renders Persian-calendar dates with Eastern
   digits.
5. A Guardian opens the family portal, sees only family navigation, and cannot
   open staff screens.

The admin journey changes the temporary password, so always rebuild the
disposable database before rerunning it. `web/test-results/` and
`web/playwright-report/` are ignored by Git.
