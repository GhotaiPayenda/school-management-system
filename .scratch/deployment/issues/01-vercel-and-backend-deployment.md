# 01: Vercel SPA and persistent PHP API deployment

**What to build:** The repository can be imported into Vercel and deployed without editing files. Vercel builds and serves the React SPA, rewrites client routes to `index.html`, and proxies `/api/*` to a persistent PHP + SQLite host configured at runtime. The same repository builds a Docker image for that host with a persistent `/data` volume, production-safe seeding, and a health check.

**Status:** done

- [x] `vercel.json` builds `web/` with `npm ci`/`vite build`, publishes `web/dist`, and falls back to `index.html` without touching `/api/`.
- [x] Root `proxy.js` proxies `/api/*` to `MERIDIAN_API_ORIGIN`, forwards method, headers, cookies, and body, sets `X-Forwarded-*`, preserves multiple `Set-Cookie` headers and 204 responses, and returns a clear 503/502 JSON error.
- [x] `Dockerfile` builds the SPA and serves it plus the API from PHP 8.2 + Apache with `/data` as the only persistent location; `docker/entrypoint.sh` migrates, seeds, prepares permissions, and honours `PORT`.
- [x] `render.yaml` describes the persistent API host with a disk, health check, and production environment.
- [x] Production seeding skips the demo school with `MERIDIAN_SEED_DEMO=0` (or `--no-demo`) while still seeding roles, permissions, settings, and the Super Admin.
- [x] `MERIDIAN_TRUST_PROXY=1` makes the API read the client address from `X-Forwarded-For`/`X-Real-IP` so the sign-in rate limiter stays per client.
- [x] `docs/deployment.md`, `README.md`, `docs/specs/meridian-academy-v1.md`, and `.env.example` document the architecture, steps, environment, limits, and troubleshooting.
- [x] PHP lint, API suite, i18n check, and production build pass.

## Comments

- Vercel has no first-class PHP runtime and functions have an ephemeral filesystem, so a fully Vercel-only deployment is not possible with this architecture. The SPA is static on Vercel and the API runs on a persistent host.
- The Vercel routing middleware request limit is 4 MB. Student photos and the school logo are capped at 2 MB and pass; document uploads are capped at 10 MB in the app, so larger files need the Docker deployment that serves the SPA and API from one host.
- Verified locally: proxy health, CSRF, login, authenticated read, logout 204 with cookie, multi-cookie preservation, forwarded client IP, query strings, and the missing-origin 503 all behave as expected. `--no-demo` produced one Super Admin and zero students/staff/grade levels.
- Verified: PHP lint 60 files, API suite 29/29, i18n `TOTAL 0`, production build succeeded.
