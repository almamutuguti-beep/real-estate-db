# Velora: Real Estate Management System

Velora is a web application for renting and managing properties. Visitors browse available homes, tenants register and apply, and property owners manage properties, applications, leases and income from one dashboard. The app sits on top of the group's MySQL database through an Express API, so nobody has to touch the database directly.

## Features

**Everyone**
- Public landing page with live listings, search, type filters and sorting
- Register and sign in on an animated landscape screen that follows the time of day
- Settings page: edit your profile and change your password

**Property owners**
- Add, edit and remove (soft delete) properties
- Review tenant applications: approve or reject
- Create a lease from an approved application, then activate or end it
- Tenants, payments, income chart and a per-property report
- Dashboard refreshes itself every 15 seconds

**Tenants**
- Browse available homes and apply with one click
- Track applications, leases and payment history
- Dashboard refreshes itself every 15 seconds

## How it fits together

```
Browser  ->  Next.js (port 3000)  --/api/* proxy-->  Express API (port 4000)  ->  MySQL
```

The frontend calls relative `/api/...` paths. A rewrite in `frontend/next.config.mjs` forwards them to Express, so the browser sees one site and the login cookie just works.

## Tech stack

| Layer | Technology |
|---|---|
| Database | MySQL 8.0.16 or newer, MySQL Workbench |
| Backend | Node.js, Express, mysql2, bcryptjs, jsonwebtoken, cookie-parser, dotenv |
| Frontend | Next.js (App Router), React, lucide-react, pnpm |

## Project structure

```
real-estate-db/
  sql/                      Group database scripts (tables, triggers, views, procedures, seeds)
  backend/
    server.js               Express app and route mounting
    db.js                   MySQL connection pool
    middleware/auth.js      requireAuth, requireOwner
    routes/
      auth.js               login, logout, session
      register.js           registration (Owner or Tenant)
      public.js             public listings (no login)
      settings.js           profile and password
      properties.js         owner property CRUD
      dashboard.js          owner summary and income series
      applications.js       owner application review
      tenants.js            owner tenant list
      leases.js             lease creation and status changes
      payments.js           owner payment list and summary
      reports.js            owner report
      tenant.js             tenant-only endpoints
  frontend/
    app/page.jsx            Landing page, owner dashboard and tenant dashboard switch
    components/             auth-screen, public-home, tenant-dashboard, settings-panel, forms, ui
    lib/api.js              fetch wrapper
    lib/format.js           money, date and initials helpers (currency is set here)
    public/landing.jpg      Landing page photo
```

## Getting started

### 1. Database

1. Open MySQL Workbench and run the group's SQL scripts in order: tables, then triggers, then views and procedures, then the seed files.
2. Check that the schema `real_estate_db` exists and the tables are populated.

### 2. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (never commit this file):

```env
PORT=4000
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=real_estate_db
JWT_SECRET=a-long-random-string
```

Start it and confirm it works:

```bash
node server.js
```

Open <http://localhost:4000/api/health>. You should see `{"ok":true,"db":1}`.

### 3. Frontend

```bash
cd frontend
pnpm install
```

Make sure `frontend/next.config.mjs` contains the proxy:

```js
const nextConfig = {
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://localhost:4000/api/:path*' }]
  },
}
export default nextConfig
```

Start it:

```bash
pnpm dev
```

Open <http://localhost:3000>. Keep both terminals running.

## Development accounts

The seed data creates four owner accounts for local testing: `owner1` to `owner4`, all with the password `Test1234`. Use them for development only. Register a new tenant from the app to try the tenant side.

## Typical workflow

1. A tenant registers and applies for an available home.
2. The owner sees the application, approves it, and chooses **Create lease**.
3. The owner activates the lease once it is signed. The property becomes **Rented** and the tenant sees the lease.
4. Ending the lease makes the property **Available** again.

## API reference

All endpoints return JSON. Errors look like `{ "error": "message", "code": "OPTIONAL_CODE" }`.

| Area | Endpoints | Access |
|---|---|---|
| Health | `GET /api/health` | Public |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session` | Public, session |
| Public | `GET /api/public/properties?search=` | Public |
| Settings | `GET /api/settings`, `PATCH /api/settings/profile`, `POST /api/settings/password` | Signed in |
| Properties | `GET /api/properties`, `POST /api/properties`, `GET/PATCH/DELETE /api/properties/:id` | Owner |
| Dashboard | `GET /api/dashboard/summary` | Owner |
| Applications | `GET /api/applications?status=`, `GET/PATCH /api/applications/:id` | Owner |
| Tenants | `GET /api/tenants`, `GET /api/tenants/:id` | Owner |
| Leases | `GET /api/leases`, `POST /api/leases`, `PATCH /api/leases/:id` | Owner |
| Payments | `GET /api/payments?from=&to=`, `GET /api/payments/summary` | Owner |
| Reports | `GET /api/reports/owner` | Owner |
| Tenant | `GET/POST /api/tenant/applications`, `GET /api/tenant/leases`, `GET /api/tenant/payments` | Tenant |

## Business rules the API enforces

- The owner or tenant identity always comes from the login session, never from the request body.
- Properties are soft deleted (status `Removed`). A property with a `Signed` or `Active` lease cannot be removed.
- A lease can only be created from an `Approved` application, once per application.
- Activating a lease sets the property to `Rented`. Ending it sets the property back to `Available` when no other lease is active.
- Only payments with status `Complete` count towards income.
- A tenant's national ID number is never returned by any endpoint.
- Registration only allows the `Owner` and `Tenant` roles. Passwords are stored as bcrypt hashes, the session lives in an HTTP-only cookie for 8 hours, and every SQL value goes through a placeholder.

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `injected env (0)` and `Access denied for user ''` | `backend/.env` is missing or empty. Recreate it from the template above. |
| `Cannot find module './routes/...'` | A route file is missing from `backend/routes/`, or you started the server from the wrong folder. Run it from `backend/`. |
| A new endpoint returns `404` | The backend was not restarted. Node reads files only at startup. |
| `EADDRINUSE` on port 4000 | An old server is still running. Stop it, then start again. |
| `Module not found: Can't resolve '../lib/format'` | `frontend/lib/format.js` is missing. |
| `Table ... doesn't exist` | The database was not fully built. Rerun the SQL scripts in order and check Workbench's Output panel for red crosses. |
| Login returns `401` for a seeded owner | The stored password hash is wrong. Regenerate it with bcrypt and update the seed file. |

## Git workflow

- Work on a feature branch, never directly on `main`: `feature/<short-name>`.
- Commit messages follow `type(scope): description`, for example `feat(api): add lease endpoints`.
- Before switching branches, commit your work. Check `git status` shows nothing unexpected, and never commit `.env` or `node_modules`.

## Known limitations

- Payments are read-only in the app. They are recorded by the payment gateway side of the database design.
- The notification bell shows the number of pending applications, because the database has no notifications table.
- Accounts are verified automatically on registration. The group's `sp_login` procedure expects an admin to verify accounts, and the app has no admin screen.
- Admin, Agent and Worker roles exist in the database, but the app serves owners and tenants only.
- The registration endpoint has no rate limiting.
- Prices show as `KSh`. Change `CURRENCY` in `frontend/lib/format.js` to use another currency.

## Credits

Team: Louisa Flora
      Alma Mutuguti
      Chedvah Lukombola
      Adan Chueb
      Mohamed Yusuf
      Lemayian Kanyeki

