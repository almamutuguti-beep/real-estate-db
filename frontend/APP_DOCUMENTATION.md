# Velora Real Estate Management UI

## 1. What this app is

Velora is a React and Next.js dashboard prototype for a real-estate rental management system. It is designed for a property owner to monitor properties, applications, tenants, payments, reports, and settings from one workspace.

The current version is a frontend demo. Its data is intentionally hardcoded so the interface can be reviewed before connecting it to the project’s MySQL database and production APIs.

The database design follows the supplied **Group Database Guide**:

- Property Owner: `property_owner`, `property`
- Tenant: `tenant`, `rental_application`, `property_viewing`
- Agent: `agent`, `property_listing`, `property_enquiry`
- Maintenance Worker: `maintenance_worker`, `maintenance_request`
- System Admin: `user_account`, `lease_agreement`
- Payment Gateway: `payment`

## 2. Technology and installation

The project uses:

- React 19
- Next.js 16 App Router
- JavaScript/JSX, 
- Lucide React for icons
- Tailwind CSS 4 infrastructure
- pnpm as the package manager

Install dependencies from the project root, the folder containing `package.json`:

```bash
cd /path/to/project
pnpm install
```

Start the development server:

```bash
pnpm dev
```

Then open `http://localhost:3000`.

The existing dependencies are already listed in `package.json`. The main runtime packages are `next`, `react`, `react-dom`, `lucide-react`, and the styling utilities. You do not need to install another package to run the current demo.

## 3. Important files and where code belongs

```text
app/
  page.jsx              Main dashboard UI and temporary demo interactions
  layout.jsx            HTML shell and page metadata
  globals.css           Velora color tokens, typography, layout, and responsive styles
  api/                  Next.js API Route Handlers should be placed here

components/
  ui/                   Reusable UI components

lib/
  api.js                Recommended shared API client
  db.js                 Recommended database connection module

public/                 Static images and icons
package.json            Scripts and dependencies
```

The current dashboard is in `app/page.jsx`. For a larger production implementation, split the page into components such as `components/dashboard/sidebar.jsx`, `components/dashboard/stats-grid.jsx`, and `components/dashboard/property-card.jsx`.

## 4. How the current UI works

### Navigation

The left navigation changes the active workspace label for Overview, Properties, Applications, Tenants, and Payments. Reports and Settings currently display a temporary API demo message.

### Property search

The search field filters the displayed property cards in memory. It currently filters the sample properties defined near the top of `app/page.jsx`.

### Add property

The **Add property** button opens a modal. The modal explains that the future backend request will use `POST /api/properties`. The current Create property button only shows a demo message; it does not save a record.

### Notifications and row actions

Notification, details, application, report, settings, income filter, and sign-out actions currently show a temporary mock API message. These actions are placeholders for real requests.

### Dashboard metrics and chart

The property count, income total, tenant count, applications, and chart are sample values. They should eventually be returned by dashboard endpoints scoped to the authenticated owner.

## 5. API placeholders to implement

Create each API route under `app/api`. In Next.js App Router, each endpoint is a folder containing a `route.js` file:

```text
app/api/properties/route.js
app/api/properties/[propertyId]/route.js
```

A route handler exports functions such as `GET`, `POST`, `PATCH`, and `DELETE`.

### Dashboard

`GET /api/dashboard/summary`

Returns the owner dashboard summary:

```json
{
  "totalProperties": 12,
  "monthlyIncome": 184200,
  "activeTenants": 28,
  "openApplications": 3,
  "incomeSeries": [
    { "month": "Jan", "amount": 142000 },
    { "month": "Feb", "amount": 151500 }
  ]
}
```

The server must derive these values from database records, not from client input.

### Properties

`GET /api/properties?search=harbor&status=Available`

Lists properties belonging to the signed-in owner. Supports search and status filters.

`POST /api/properties`

Creates a property. Expected body:

```json
{
  "title": "The Willow Estate",
  "address": "10 Example Road",
  "city": "Cape Town",
  "propertyType": "Apartment",
  "bedrooms": 2,
  "monthlyRent": 18500
}
```

Required server rules:

- Require an authenticated property owner.
- Set `owner_id` from the session, never from an untrusted request body.
- Validate positive rent and valid property status.
- Use parameterized SQL.
- Return `201 Created` with the created property.

`GET /api/properties/[propertyId]`

Returns one property only if it belongs to the signed-in owner.

`PATCH /api/properties/[propertyId]`

Updates allowed property fields. Use a soft delete by changing status to `Removed`; do not physically delete a property.

`DELETE /api/properties/[propertyId]`

Optional convenience endpoint. It should perform the same soft-delete behavior as `PATCH`, and reject removal when an active lease exists.

### Applications

`GET /api/applications?status=Pending`

Returns applications for properties owned by the authenticated owner.

`GET /api/applications/[applicationId]`

Returns application details, tenant details, property details, and status history when available.

`PATCH /api/applications/[applicationId]`

Updates an application to `Pending`, `Approved`, or `Rejected`. Confirm that the application belongs to one of the owner’s properties.

### Tenants

`GET /api/tenants`

Returns tenants connected to the owner’s active leases. Never return tenants belonging to another owner.

`GET /api/tenants/[tenantId]`

Returns the tenant’s permitted profile, lease, property, and payment information.

### Payments and income

`GET /api/payments?from=2026-01-01&to=2026-12-31`

Returns completed payments for the owner’s properties.

`GET /api/payments/summary`

Returns totals used by the Income overview card and chart.

Payment records should follow the database guide’s payment lifecycle. A payment may begin as `Pending`; it should only become complete after a valid gateway confirmation ID and confirmed gateway status exist.

### Reports

`GET /api/reports/owner`

Returns properties, occupancy, tenant counts, and income for the authenticated owner. This corresponds to the database guide’s `sp_owner_report(owner_id)` procedure.

### Notifications

`GET /api/notifications`

Returns unread notifications for the current user.

`PATCH /api/notifications/[notificationId]`

Marks a notification as read.

### Authentication

The production app needs authentication before exposing owner data:

- `POST /api/auth/register` for tenant registration if registration is part of the web app.
- `POST /api/auth/login` for login.
- `POST /api/auth/logout` for ending a session.
- `GET /api/auth/session` for checking the current session.

Use secure, HTTP-only cookies or the project’s chosen authentication provider. Do not store passwords in frontend state, localStorage, or source files.

## 6. Recommended API route implementation pattern

Example placeholder route:

```js
// app/api/properties/route.js
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  return NextResponse.json({
    data: [],
    search,
    message: 'Replace this placeholder with a database query.'
  })
}

export async function POST(request) {
  const body = await request.json()

  if (!body.title || !body.monthlyRent) {
    return NextResponse.json(
      { error: 'title and monthlyRent are required' },
      { status: 400 }
    )
  }

  return NextResponse.json(
    { data: body, message: 'Placeholder response' },
    { status: 201 }
  )
}
```

This is only a development placeholder. Before production, add authentication, schema validation, parameterized database queries, ownership checks, and consistent error handling.

## 7. Connecting the UI to the APIs

Create a shared client at `lib/api.js`:

```js
export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload.error || 'Request failed')
  }

  return payload
}
```

Then replace hardcoded dashboard data with requests such as:

```js
const result = await apiFetch('/api/properties?search=harbor')
```

For a production dashboard, fetch initial data in a server component or use a client data library such as SWR for interactive filtering and cache updates. Do not use `localStorage` as the database.

## 8. Database integration responsibilities

The supplied database guide uses MySQL 8.0.16 or newer, MySQL Workbench, and SQL scripts shared through GitHub. The API layer should call the database through a server-only connection module, for example `lib/db.js`.

The API must enforce the same rules as the database:

- Use foreign keys and named constraints.
- Use `DECIMAL(12,2)` for money.
- Use `DATE` and `DATETIME` appropriately.
- Use status values from the agreed database design.
- Use soft deletes for properties and accounts.
- Reject removing a property with an active lease.
- Allow a lease only after an approved rental application.
- Filter every owner query by the authenticated owner ID.
- Keep payment confirmation rules on the server and in database triggers where appropriate.

Do not put MySQL credentials in `app/page.jsx` or any browser-executed file. Put them in environment variables and access them only from server-side route handlers or server modules.

## 9. Suggested environment variables

Create `.env.local` in the project root for local development. Do not commit it:

```env
DATABASE_URL=mysql://username:password@localhost:3306/real_estate_db
AUTH_SECRET=replace-with-a-long-random-secret
PAYMENT_GATEWAY_URL=https://sandbox.example-payment-provider.test
PAYMENT_GATEWAY_SECRET=replace-with-server-only-secret
```

Use sandbox payment credentials during development. Never expose server-only values through variables beginning with `NEXT_PUBLIC_`.

## 10. API response and error conventions

Use predictable status codes:

- `200`: successful read or update
- `201`: successful creation
- `400`: invalid request data
- `401`: not authenticated
- `403`: authenticated but not allowed to access the record
- `404`: record does not exist or is not visible to the user
- `409`: business conflict, such as removing a property with an active lease
- `500`: unexpected server failure

Recommended error format:

```json
{
  "error": "Property cannot be removed while it has an active lease",
  "code": "ACTIVE_LEASE_CONFLICT"
}
```

## 11. Testing checklist

Before replacing the demo data, test:

- The dashboard loads with an authenticated owner.
- An owner cannot read another owner’s property.
- Search filters properties correctly.
- Invalid or negative rent is rejected.
- A property is soft-deleted instead of physically removed.
- A property with an active lease cannot be removed.
- Pending, approved, and rejected applications are handled correctly.
- Income only includes completed payments for the owner’s properties.
- Unauthenticated requests receive `401`.
- Invalid JSON and missing fields receive `400`.
- Database errors do not expose passwords, SQL, or secrets.

## 12. Moving from demo to production

1. Keep the visual styles and layout in `app/globals.css`.
2. Move sample arrays out of `app/page.jsx` and replace them with API data.
3. Add authentication and session ownership checks.
4. Add `app/api/**/route.js` handlers.
5. Add a server-only database module in `lib/db.js`.
6. Connect routes to the MySQL schema from the group guide.
7. Validate inputs on the server.
8. Add loading, empty, and error states to the UI.
9. Run the database test scripts and API tests.
10. Deploy only after secrets are configured in the hosting provider’s environment settings.
