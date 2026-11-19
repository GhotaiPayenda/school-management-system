# Deploying Meridian Academy

The application has two parts that deploy separately:

| Part | What it is | Where it runs |
| --- | --- | --- |
| SPA | `web/` built by Vite into static files | Vercel |
| API | PHP 8.2 + SQLite under `api/`, `database/`, `scripts/` | A persistent host with a disk |

## Why the API is not on Vercel

Vercel has no first-class PHP runtime, and its functions run on an ephemeral
filesystem. This API is a long-lived PHP application with a SQLite database,
uploads, and backups. Those need a disk that keeps its contents between
requests and deploys. Vercel also does not guarantee that concurrent requests
reach the same instance, which SQLite requires.

So the API runs on Render, Railway, Fly.io, or any VPS using the `Dockerfile`
in this repository, and Vercel serves the SPA and proxies `/api/*` to it.

```text
Browser
  |
  |  https://meridian.vercel.app
  v
Vercel  ── static SPA ──────────────────────────────┐
  |                                                 │
  |  proxy.js forwards /api/* to MERIDIAN_API_ORIGIN│  same origin, so the
  v                                                 │  session cookie and CSRF
API host (Render/Railway/Fly/VPS)                   │  header work unchanged
  |                                                 │
  └── /data/meridian.sqlite, /data/storage ─────────┘
```

The proxy keeps the browser on one origin. The `meridian_session` cookie has no
`Domain` attribute, so it is host-only for the Vercel domain, and no CORS
configuration is required.

## 1. Deploy the API host first

### Option A: Render blueprint

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint**, select the repository, and apply
   `render.yaml`.
3. Enter `MERIDIAN_ADMIN_EMAIL` and `MERIDIAN_ADMIN_PASSWORD` when prompted.
   The password is temporary; the Super Admin must change it at first sign-in.
4. Wait for `/api/v1/health` to report `ok`.

The blueprint uses a paid instance because persistent disks are not available on
the free plan. It mounts a 1 GB disk at `/data` and keeps one instance. SQLite
allows a single writer; do not add replicas or autoscaling.

### Option B: any Docker host

```bash
docker build -t meridian-academy .
docker run -d --name meridian \
  -p 8080:80 \
  -v meridian-data:/data \
  -e MERIDIAN_ENV=production \
  -e MERIDIAN_SECURE_COOKIES=1 \
  -e MERIDIAN_SEED_DEMO=0 \
  -e MERIDIAN_ADMIN_EMAIL=admin@your-school.edu.af \
  -e MERIDIAN_ADMIN_PASSWORD='a-strong-temporary-password' \
  meridian-academy
```

Put HTTPS in front of it. The image contains the built SPA as well as the API,
so `http://localhost:8080` serves the whole application from one origin. This
is also the option to use when the school needs document uploads larger than
Vercel's proxy limit (see below).

On first boot the entrypoint applies migrations and seeders, then hands
`/data` to Apache. Set `MERIDIAN_AUTO_MIGRATE=0` only if you run
`php scripts/db.php setup` yourself.

### Option C: an existing PHP host

Point the web root at `api/public`, enable `mod_rewrite`, and allow
`.htaccess` (a rewrite file is included). Serve `web/dist` as static files.
Set the environment variables from [the reference](#environment-reference) and
run `php scripts/db.php setup` once.

### Health check

`GET /api/v1/health` returns `200` with `"status": "ok"` when the database and
storage directory are usable, and `503` otherwise. Use it as the platform health
check.

## 2. Deploy the SPA to Vercel

1. In Vercel, **Add New → Project** and import the repository.
2. Leave **Root Directory** at the repository root. `vercel.json` builds
   `web/` and publishes `web/dist`.
3. Add an environment variable for **Production and Preview**:

   | Name | Value |
   | --- | --- |
   | `MERIDIAN_API_ORIGIN` | The API host origin, for example `https://meridian-academy-api.onrender.com` |

   Use the origin only: no trailing slash, no `/api` suffix.

4. Deploy. Vercel runs `npm --prefix web ci` and
   `npm --prefix web run build`, publishes `web/dist`, rewrites unknown paths to
   `index.html`, and sends `/api/*` through `proxy.js`.

Nothing else is needed. Do not set `VITE_API_BASE_URL` on Vercel; the SPA
already calls the relative path `/api/v1`.

### Custom domain

Add the domain in Vercel. Leave `MERIDIAN_API_ORIGIN` pointing at the API host;
the browser never talks to it directly.

## 3. First sign-in

Open the Vercel URL and sign in as the Super Admin. The seeded account is
`admin@meridian.academy` / `Meridian@2026` unless `MERIDIAN_ADMIN_EMAIL` and
`MERIDIAN_ADMIN_PASSWORD` were set on the API host. A password change is forced
on first sign-in.

Production does not seed the demonstration school because `MERIDIAN_SEED_DEMO=0`.
Roles, permissions, school settings, and the Super Admin are still seeded, so
the school starts empty and ready for real setup.

## Environment reference

### Vercel

| Variable | Required | Purpose |
| --- | --- | --- |
| `MERIDIAN_API_ORIGIN` | yes | Origin of the persistent API host. |

### API host

| Variable | Default | Purpose |
| --- | --- | --- |
| `MERIDIAN_ENV` | `local` | Set `production` to disable debug output. |
| `MERIDIAN_DB_PATH` | `storage/meridian.sqlite` | SQLite file. Use `/data/meridian.sqlite` in the container. |
| `MERIDIAN_STORAGE_PATH` | `storage/` | Uploads and backups. Use `/data/storage`. |
| `MERIDIAN_SECURE_COOKIES` | `0` | Set `1` when the public site is HTTPS. |
| `MERIDIAN_TRUST_PROXY` | `0` | Set `1` behind a platform proxy so the login rate limiter sees client IPs. |
| `MERIDIAN_SEED_DEMO` | `1` | Set `0` for production. |
| `MERIDIAN_AUTO_MIGRATE` | `1` | Container entrypoint runs `scripts/db.php setup`. |
| `MERIDIAN_ADMIN_EMAIL` | `admin@meridian.academy` | Seeded Super Admin email. |
| `MERIDIAN_ADMIN_PASSWORD` | `Meridian@2026` | Temporary Super Admin password. |
| `PORT` | `80` | Port the container listens on; injected by Render. |

Keep `MERIDIAN_DB_PATH` and `MERIDIAN_STORAGE_PATH` on the persistent disk.
Anything written elsewhere is lost on redeploy.

## Deploying updates

Push to the connected branch. Vercel rebuilds the SPA; the API host rebuilds the
image. On boot the entrypoint applies new migrations and seeders. Take a backup
before a schema change and keep one API instance during the rollout.

## Backups

A Super Admin can create and download SQLite backups from **Operations**. On a
container host, backups land in `MERIDIAN_STORAGE_PATH/backups` on the same disk
as the database, so download them regularly and keep a copy off the host.
Snapshotting the `/data` volume from the platform dashboard is a second safety
net.

## Limits and operational notes

- **Vercel request-body limit.** Routing Middleware accepts at most 4 MB per
  request. Student photos and the school logo are capped at 2 MB in the app, so
  they pass. Document uploads are capped at 10 MB in the app, so uploads above
  roughly 3 MB will be rejected by Vercel before they reach PHP. Use the Docker
  deployment that serves the SPA and API from the same origin when the school
  needs larger scans, or upload those files from a network that reaches the API
  host directly. The image raises PHP's `post_max_size` to 64 MB for that case.
- **One instance.** SQLite has one writer. Run a single API instance and do not
  enable horizontal scaling.
- **Cold starts.** A sleeping free-tier host adds latency to the first request.
  Use an always-on instance for a school day.
- **Cookies require HTTPS.** With `MERIDIAN_SECURE_COOKIES=1` the cookie is
  only sent over HTTPS. Use the platform's TLS endpoint, not the container IP.
- **Trust proxy.** Set `MERIDIAN_TRUST_PROXY=1` only when a platform proxy
  overwrites `X-Forwarded-For`; otherwise clients could spoof their address and
  bypass the sign-in rate limiter.
- **Demo data.** A database seeded with `MERIDIAN_SEED_DEMO=0` records the demo
  seeder as applied. It will not appear later if the variable is removed.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `503` with "The API origin is not configured" | `MERIDIAN_API_ORIGIN` is missing on Vercel, or the deployment was built before it was added. Redeploy. |
| `502` with "The school server could not be reached" | The API host is down, sleeping, or the origin is wrong. Open `/api/v1/health` on the API host. |
| Health check stays `503` | `/data` is not writable by `www-data`, or the disk is missing. Check the volume mount and `MERIDIAN_DB_PATH`. |
| Sign-in says too many attempts after a few tries | `MERIDIAN_TRUST_PROXY` is off, so every user shares the proxy address. Set it to `1` and restart. |
| Login succeeds but the session is lost | The site is served over HTTP while `MERIDIAN_SECURE_COOKIES=1`, or the API host is being called cross-origin instead of through the Vercel proxy. |
| `413` when uploading a document | The file is above the Vercel proxy limit. See the limits section. |
