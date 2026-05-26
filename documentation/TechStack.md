# Tech Stack

## Our Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js (React) | Modern, fast, handles both UI and API in one project |
| Backend | Next.js API routes | No need for a separate server — keeps things simple |
| Database | Hosted PostgreSQL | Cheap, relational, production-ready, and usable from local development |
| ORM | Prisma | Clean database queries, easy schema management |
| Payments | Manual payment records first | Logan needs to record payments received before online payments matter |
| Auth | Hard-coded login first, Supabase Auth later | Fastest path to an internal prototype |
| Styling | Tailwind CSS | Fast to build with, consistent UI |
| UI Components | shadcn/ui | Pre-built, clean components (tables, modals, forms) — fully customizable |

---

## Why These Choices

### Next.js
One framework handles the internal shop dashboard and API. No need to maintain a separate frontend and backend repo. TypeScript support out of the box.

### Hosted PostgreSQL
Our data is inherently relational — customers have vehicles, vehicles have maintenance history, invoices have line items, and payments link to invoices. Since the app will be hosted fairly early, use PostgreSQL from the start instead of building locally with SQLite and migrating later.

Recommended approach:
- Use one cheap hosted PostgreSQL provider for development
- Connect the local Next.js app through `DATABASE_URL`
- Use Prisma migrations to manage schema changes
- Add a separate production database before Logan starts using real shop data

Good low-cost provider options:
- Supabase Postgres
- Neon Postgres
- Railway Postgres
- Render Postgres

### Prisma
Lets us define our database schema in one clean file and generates type-safe queries. Makes it easy to evolve the schema as we add features.

### Payments
Phase 1 records payments that Logan receives outside the app, such as cash or card payments run through existing hardware. Stripe and online payment links are deferred.

### Auth
Phase 1 uses a hard-coded login for Logan so the internal dashboard can be built quickly. Supabase Auth is deferred until the app is closer to production.

### Tailwind CSS
Utility-first CSS — fast to build a clean, functional UI without writing a lot of custom styles.

### shadcn/ui
Pre-built React components (tables, modals, dropdowns, forms, buttons) built on top of Tailwind and Radix UI. Not a traditional component library — you own the code, so it's fully customizable. Gives us a professional-looking dashboard without building everything from scratch.

---

## What We're NOT Using (and Why)

| Skipped | Reason |
|---|---|
| Separate Express/Node backend | Overkill — Next.js API routes are enough |
| MongoDB | Our data is relational, not document-based |
| Redux | Too heavy for this scale — React state and server data fetching are enough |
| Microservices | One app is all we need for one shop |
| GraphQL | REST is simpler and faster to build |
