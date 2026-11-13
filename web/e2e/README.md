# Browser smoke tests (secondary seam)

The API suite in `tests/api` is the hard quality gate. This Playwright scaffold
covers the composed browser journey, but it is opt-in because it needs a built
SPA, a running API, and a disposable database.

## One-time setup

```bash
npm --prefix web install
npm --prefix web exec -- playwright install chromium
```

## Run a journey against a throwaway database

PowerShell:

```powershell
$env:MERIDIAN_DB_PATH = "$PWD\storage\e2e.sqlite"
$env:MERIDIAN_STORAGE_PATH = "$PWD\storage"
php scripts/db.php fresh --database="$env:MERIDIAN_DB_PATH"
# Terminal 1: API on 8000
php -S 127.0.0.1:8000 -t api/public api/public/router.php
# Terminal 2: Vite dev server, proxying /api to 8000
npm --prefix web run dev
# Terminal 3:
$env:MERIDIAN_E2E = "1"
$env:MERIDIAN_E2E_TEACHER_PASSWORD = "Teacher@2026"
npm run test:e2e
```

The Teacher fixture is test-only; create it if you need the RBAC journey:

```powershell
$env:MERIDIAN_DB_PATH = "$PWD\storage\e2e.sqlite"
php tests/api/fixtures/seed.php
```

The first journey changes the Super Admin password, so always rebuild the
database before rerunning it. `web/test-results/` and `web/playwright-report/`
are ignored by Git.
