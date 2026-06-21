# ServiceMarket — Full-Stack Multi-Vendor Service Marketplace

A multi-tenant marketplace (inspired by Sheba.xyz) where Admins oversee the
platform, Vendors list and manage services, and End-Users browse, book, and
pay for them through a sandboxed checkout flow.

**Stack:** Next.js 16 (App Router) · TypeScript · PostgreSQL · Drizzle ORM ·
Tailwind CSS · JWT auth (custom, via `jose`)

## 1. Quick start

### Prerequisites
- Node.js 20+
- A running PostgreSQL instance (local install, Docker, or a hosted service
  like Neon/Supabase)

### Setup

```bash
npm install

# Create a .env file in the project root:
cat > .env << 'EOF'
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/service_marketplace"
JWT_SECRET="replace-with-a-long-random-string"
EOF

# Push the schema to your database (creates all tables/enums)
npm run db:push

# Seed demo data (4 vendors with 8 services, an admin, two buyers, one
# sample completed order)
npm run db:seed

# Start the dev server
npm run dev
```

Visit `http://localhost:3000`.

### Demo accounts (all use password `password123`)

| Role   | Email                          | Notes                         |
|--------|----------------------------------|--------------------------------|
| Admin  | admin@servicemarket.test         | Platform oversight dashboard   |
| Vendor | plumbing@servicemarket.test      | Acme Plumbing Co — 2 listings  |
| Vendor | electric@servicemarket.test      | BrightSpark Electric — 2 listings |
| Vendor | landscaping@servicemarket.test   | GreenLeaf Landscaping — 2 listings |
| Vendor | design@servicemarket.test        | Pixel Perfect Studio — 2 listings |
| User   | buyer@servicemarket.test         | Has one completed order on record |

### Useful scripts

```bash
npm run dev          # start dev server
npm run build        # production build
npm run start        # run the production build
npm run db:push       # sync schema to the database (dev-friendly, no migration files)
npm run db:generate   # generate SQL migration files from the schema (for production workflows)
npm run db:studio     # open Drizzle Studio, a GUI for browsing the database
npm run db:seed       # populate demo data
```

## 2. Entity-Relationship Diagram

```mermaid
erDiagram
    USERS ||--o| VENDOR_PROFILES : "has (if role=VENDOR)"
    USERS ||--o{ ORDERS : "places (as buyer)"
    VENDOR_PROFILES ||--o{ SERVICES : "lists"
    VENDOR_PROFILES ||--o{ ORDERS : "receives"
    SERVICES ||--o{ ORDERS : "booked in"

    USERS {
        uuid id PK
        varchar email UK
        text password_hash
        varchar name
        enum role "ADMIN, VENDOR, USER"
    }
    VENDOR_PROFILES {
        uuid id PK
        uuid user_id FK_UK
        varchar business_name
        text description
        varchar category
    }
    SERVICES {
        uuid id PK
        uuid vendor_id FK
        varchar title
        text description
        varchar category
        numeric price
        enum status "ACTIVE, PAUSED, ARCHIVED"
    }
    ORDERS {
        uuid id PK
        uuid buyer_id FK
        uuid service_id FK
        uuid vendor_id FK
        int quantity
        numeric price_at_booking
        enum status "PENDING, CONFIRMED, COMPLETED, CANCELLED"
        enum payment_status "PENDING, PAID, FAILED, REFUNDED"
        varchar mock_payment_reference
    }
```

A text/ASCII version, for any viewer that doesn't render Mermaid:

```
┌─────────────────────────┐
│ users                     │
├─────────────────────────┤
│ id               PK       │
│ email            UQ        │
│ password_hash                │
│ name                          │
│ role   ADMIN/VENDOR/USER        │
│ created_at, updated_at            │
└─────────────────────────┘
         │ 1
         │
         │ 0..1   (only if role = VENDOR)
         ▼
┌─────────────────────────┐
│ vendor_profiles           │
├─────────────────────────┤
│ id               PK       │
│ user_id          FK, UQ -> users.id
│ business_name                │
│ description                    │
│ category                          │
│ created_at, updated_at              │
└─────────────────────────┘
         │ 1
         │
         │ 0..N
         ▼
┌─────────────────────────┐
│ services                  │
├─────────────────────────┤
│ id               PK       │
│ vendor_id        FK -> vendor_profiles.id
│ title                        │
│ description                    │
│ category                          │
│ price                                │
│ status   ACTIVE/PAUSED/ARCHIVED        │
│ created_at, updated_at                    │
└─────────────────────────┘
         │ 1
         │
         │ 0..N
         ▼
┌─────────────────────────┐
│ orders                    │
├─────────────────────────┤
│ id               PK       │
│ buyer_id         FK -> users.id
│ service_id       FK -> services.id
│ vendor_id        FK -> vendor_profiles.id   (denormalized, see below)
│ quantity                       │
│ price_at_booking                  │
│ status        PENDING/CONFIRMED/COMPLETED/CANCELLED
│ payment_status   PENDING/PAID/FAILED/REFUNDED
│ mock_payment_reference                │
│ created_at, updated_at                  │
└─────────────────────────┘
```

**Relationship summary:**
- A `User` may have **one** `VendorProfile` (only if `role = VENDOR`) — a
  1:0..1 relationship, enforced by a `UNIQUE` constraint on
  `vendor_profiles.user_id`.
- A `VendorProfile` owns **many** `Service` listings (1:N), `ON DELETE
  CASCADE` — deleting a vendor profile removes its listed services.
- A `Service` can appear in **many** `Order`s (1:N), `ON DELETE RESTRICT` —
  a service can't be hard-deleted while order history references it (see
  the soft-delete note below).
- An `Order` links a buyer (`User`), a `Service`, and (denormalized) the
  owning `VendorProfile` directly, so a vendor's job queue can be fetched
  with a single indexed query rather than joining through `services` every
  time.

## 3. Must-Explain: "vibe coding" engineering workflow

This project was built using AI-assisted development end-to-end, with a
deliberate "schema-first, then verify-by-running" workflow rather than
generating large amounts of code and hoping it's correct:

1. **Schema and architecture decided first**, on paper, before any code:
   table design, RBAC boundaries, and the route-protection strategy were
   planned before scaffolding.
2. **AI tooling scaffolded the bulk of the implementation** — Next.js App
   Router structure, Drizzle schema, REST API route handlers, and React
   pages — directed with specific, scoped prompts per layer (auth first,
   then services, then orders, then frontend) rather than one large
   "build the whole app" request.
3. **Every layer was verified by actually running it**, not just read
   through: the database schema was pushed to a real local PostgreSQL
   instance, every API route was exercised with real HTTP requests
   (registration, login, RBAC-denied requests, full checkout flow,
   cross-role ownership checks) before the frontend was built on top of it,
   and a full `next build` was run to catch anything dev mode might hide.

**Where AI tooling succeeded:** scaffolding consistent CRUD route handlers
across services/orders/admin endpoints, generating idiomatic Drizzle
relational query syntax, and producing a working RBAC proxy layer with
sound first-principles reasoning (e.g. correctly explaining *why* Next.js
16 renamed `middleware.ts` to `proxy.ts`, and structuring auth as
defense-in-depth — role gating at the edge, ownership checks in handlers
— rather than relying on just one layer).

**Where it required manual intervention/correction:** the most significant
issue was a **schema-vs-application-code mismatch** — the database schema
initially used different column and enum names (`userId`/`totalAmount`/
`ACTIVE,INACTIVE`) than what the already-written API route handlers
expected (`buyerId`/`priceAtBooking`/`ACTIVE,PAUSED,ARCHIVED`). This wasn't
caught by TypeScript alone (the schema file in isolation was internally
consistent) — it only surfaced by grep-auditing every route file's actual
column/enum usage and cross-checking it against the schema, then verifying
with real database queries. This is a representative example of why
"the code compiles" and "the code is correct" are different bars, and why
every layer in this build was checked with live requests against a real
database rather than trusted on read-through. A second, smaller issue: this
build environment's network access blocked Prisma's binary-engine download
(`binaries.prisma.sh`), which required switching the ORM to Drizzle
mid-build — a deliberate, verified substitution rather than continuing with
an unverifiable dependency.

## 4. Must-Explain: state management & route protection

**Frontend state:** Authentication state is managed via a single React
Context (`AuthContext`) that fetches `/api/auth/me` on mount and exposes
`{ user, loading, refresh, logout }` to the component tree. Pages and the
navbar read this context rather than each independently calling the API,
keeping the "who is logged in" state as a single source of truth on the
client. Server state (services, orders) is fetched per-page with `fetch`
inside `useEffect` and kept in local component state — there's no global
client-side data cache (e.g. no React Query) since the data volume and
interaction patterns here don't yet justify that complexity; each dashboard
section reloads its own data when it mounts or after a mutation.

**Route protection — two layers, deliberately:**

1. **Edge-layer gate (`src/proxy.ts`).** Every request matching a protected
   prefix (`/dashboard/*`, `/checkout/*`, `/api/admin/*`, `/api/vendor/*`,
   `/api/orders/*`) is checked here first, before any page or API handler
   runs. It verifies the JWT from an httpOnly cookie, checks the role
   against a per-prefix allowlist, and either lets the request through (with
   verified identity forwarded via request headers), redirects
   unauthenticated browser requests to `/login` (preserving the original
   destination via `?redirectTo=`), redirects wrong-role browser requests to
   `/unauthorized`, or returns a JSON `401`/`403` for API requests. A single
   matcher list makes it structurally harder to accidentally ship a new
   protected page without a guard, compared to scattering checks across
   individual pages.
2. **Row-level ownership checks inside route handlers.** The proxy only
   answers "is this request authenticated, with an acceptable role" — it
   has no way to know if, say, *this specific* service belongs to *this
   specific* vendor. Each handler that mutates or reads a specific resource
   (e.g. `PATCH /api/vendor/services/[id]`) independently re-verifies that
   the resource's `vendorId` matches the requesting vendor's profile before
   acting, so a logged-in vendor can never modify another vendor's listing
   even though both would pass the proxy's role check identically.

This two-layer design is deliberate: a single edge check cannot reason
about row ownership without querying the database on every request (which
would make the proxy itself a performance and complexity bottleneck), and
relying on only handler-level checks risks a forgotten check on some future
route. Splitting the responsibility keeps each layer doing one clear job.

**Auth token mechanics:** passwords are hashed with `bcrypt` (10 salt
rounds); sessions use a signed JWT (`jose`, HS256) stored in an `httpOnly`,
`sameSite=lax` cookie (not `localStorage`, to reduce XSS exposure), with a
7-day expiry. `jose` was chosen over the more common `jsonwebtoken` package
specifically because it's Edge Runtime-compatible, which Next.js's proxy
layer can run under.

## 5. Must-Explain: database schema rationale

- **`price_at_booking` on `orders`, not just a reference to `services.price`:**
  services snapshot their price into the order at booking time. If a vendor
  later changes a service's price, every historical order must keep
  reflecting what the buyer actually paid — order totals must never
  retroactively change.
- **Soft-delete via `ARCHIVED` status, not a hard `DELETE`:** `services.id`
  is referenced by `orders.service_id` with `ON DELETE RESTRICT`, so a
  service with any order history physically cannot be hard-deleted without
  breaking that history. Vendors instead set a service to `ARCHIVED`
  (hidden from the public catalog, but still resolvable for old orders) or
  `PAUSED` (temporarily hidden, fully reversible).
- **`vendor_id` denormalized onto `orders`** (in addition to `service_id`):
  technically derivable by joining through `services`, but stored directly
  so a vendor's "received jobs" dashboard query is a simple indexed lookup
  on `orders.vendor_id` rather than a join on every dashboard load.
- **Cascade rules differ deliberately by relationship:** deleting a `User`
  cascades to their `VendorProfile` and `Order`s (a removed account's data
  shouldn't linger), but deleting a `Service` or `VendorProfile` that has
  order history is restricted, not cascaded, because order/financial
  records should never silently disappear.

## 6. Notable additions

- **Service images.** `services.image_url` is optional: vendors can paste a
  direct image URL when creating a listing; if left blank, the UI falls
  back to a category-appropriate stock photo (`src/lib/images.ts`, using
  Lorem Picsum's seed-based URLs — deterministic, no API key, no
  attribution requirement). Rendered with plain `<img>` rather than
  `next/image`, since `next/image` requires every remote hostname to be
  allow-listed in advance, which doesn't work for arbitrary vendor-pasted
  URLs.
- **Admin dashboard analytics.** `/api/admin/stats` computes real metrics
  from the database — total users/providers/bookings, platform revenue
  (a 10% commission on `COMPLETED` + `PAID` orders only), a six-month
  bookings/revenue trend (zero-filled for months with no orders, via a
  generated date series rather than a naive `GROUP BY`), an order-status
  breakdown, and provider listing-activity states. Rendered with Recharts.

## 7. Project structure

```
src/
  app/
    page.tsx                    # landing page
    login/, register/           # auth pages
    marketplace/                # public catalog + service detail
    checkout/[id]/              # booking + mock payment flow
    dashboard/{user,vendor,admin}/
    unauthorized/
    api/
      auth/{register,login,logout,me}/
      services/, services/[id]/
      vendor/services/, vendor/services/[id]/, vendor/orders/
      admin/users/, admin/orders/
      orders/, orders/[id]/
  components/Navbar.tsx
  contexts/AuthContext.tsx
  db/
    schema.ts                   # Drizzle schema (source of truth for the ERD above)
    index.ts                    # DB connection (pooled, hot-reload-safe)
    seed/seed.ts                 # demo data
  lib/
    auth.ts                     # password hashing, JWT sign/verify
    validation.ts                 # zod schemas for request bodies
    identity.ts, vendor.ts         # shared request-identity / vendor-lookup helpers
  proxy.ts                          # edge route-protection layer (see section 4)
```

## 8. Known limitations

- No real payment gateway integration — checkout is intentionally sandboxed
  per the assessment brief, generating a mock payment reference rather than
  calling Stripe/similar.
- No image upload for service listings or vendor branding; services are
  text/price only.
- No pagination on the marketplace catalog or admin tables yet — fine at
  demo scale (a handful of vendors/services), would need addressing before
  a larger real catalog.
- No automated test suite (unit/integration tests) — verification for this
  submission was done via live manual end-to-end testing against a running
  database, documented in section 3; a production version of this app
  would add Vitest/Playwright coverage.
