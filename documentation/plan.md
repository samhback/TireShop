# Build Plan

## The Approach

Build the app against a real hosted PostgreSQL database from the start, even during local development.
This avoids rebuilding the data layer when the app is hosted early and lets the local app use the same database type as production.

For now, do **not** focus on the customer-facing side of the app. The active scope is the internal shop system:

1. Login screen
2. Inventory
3. Sales reports
4. Customer records
5. Vehicle records and maintenance logs
6. Invoices
7. Payments received for invoices

---

## Confirmed Shop Requirements

These came directly from Logan, owner of Healdton Service Center:

- Track inventory
- Track part numbers, pricing, and quantities
- Generate sales reports
- Store customer information
- Store vehicle information and maintenance logs
- Create invoices
- Receive and record payments for invoices

---

## Local Setup

### Database
Use **hosted PostgreSQL via Prisma** for local development and hosting.
- Prisma manages the schema and migrations
- Local development connects to the hosted database through `DATABASE_URL`
- The hosted app connects to the same type of database, so there is no SQLite-to-PostgreSQL migration later
- Use separate databases or schemas for development and production if the project needs clean separation before Logan starts using it
- Keep the provider cheap/free while the dataset is small

### Auth
Hard-code a single set of credentials for now.
- Username: `logan`
- Password: `tireshop123` (or whatever, doesn't matter yet)
- Simple session cookie to remember the login
- Every protected page checks for that cookie — if it's not there, redirect to login
- No Supabase Auth, no OAuth, none of that until we're going live

---

## Pages to Build

### 1. Login Page
- Username + password form
- Hard-coded credential check
- On success, set a session cookie and redirect to dashboard
- On fail, show an error message
- This is the gate in front of everything below

---

### 2. Internal Dashboard
The first thing Logan sees after logging in. Quick overview of the shop.

- Outstanding unpaid invoices (count + total $)
- Low stock alerts (items below threshold)
- Today's sales total
- Recent customers (last 5)

---

### 3. Inventory
- List of all tires and parts
- Two tabs: Tires | Parts
- Each item: name, brand/size, part number, qty on hand, cost each, sell price each, low stock threshold
- Add new item
- Edit item (update qty when stock arrives)
- Low stock items highlighted in red

---

### 4. Customers
- Searchable list of all customers
- Customer profile page
  - Name, phone, email, notes
  - Their vehicles (list)
  - Full service history and maintenance logs across all their vehicles
- Add new customer
- Add vehicle to a customer
  - Year, make, model, VIN, license plate, mileage log, maintenance notes

---

### 5. Invoices
- List of all invoices with status (Unpaid, Partially Paid, Paid)
- View an invoice (clean printable layout)
- Record a payment (cash or card, manual entry for now)
- Create manual invoice
- Track payment history for each invoice

---

### 6. Reports
- Sales reports by day, week, month, and custom date range
- Total sales, payments received, unpaid invoice balance, and partially paid invoice balance
- Breakdown by payment method (cash/card/manual)
- Exportable report for bookkeeping

---

### Later: Estimates
- List of all estimates with status (Draft, Sent, Approved, Declined)
- Create new estimate
  - Link to a customer + vehicle
  - Add line items (tires, parts, labor, fees)
  - Quantity, unit price, auto-calculated subtotal + tax + total
  - Notes field
- View / edit an estimate
- Mark as Approved → converts to Invoice

---

### Later: Appointments
- Calendar view
- List of upcoming appointments
- Create new appointment
- Edit / cancel appointment
- Appointment status

---

## Build Order

Build in this order — each section builds on the last.

| Step | What | Why |
|---|---|---|
| 1 | Project setup | Next.js + Tailwind + shadcn/ui + Prisma + hosted PostgreSQL |
| 2 | Login page + auth | Everything else is locked behind this |
| 3 | Layout + navigation | Sidebar/nav that wraps all protected pages |
| 4 | Inventory | Core Logan requirement; mostly standalone |
| 5 | Customers + vehicles | Required before maintenance logs and invoices are useful |
| 6 | Maintenance logs | Tied to customers and vehicles |
| 7 | Invoices | Core money workflow |
| 8 | Payments | Needed to mark invoices paid/partially paid |
| 9 | Reports | Needs invoices, payments, and inventory records |
| 10 | Dashboard | Built last so it can pull real data from all internal sections |

---

## Seed Data

Once the schema is set up, create a seed script that populates the development PostgreSQL database with fake data so there's something to look at while building:

- 10 fake customers with vehicles
- 10 fake invoices (mix of paid/unpaid)
- 20 fake payments across those invoices
- 20 fake maintenance log entries
- 30 fake inventory items (a few flagged as low stock)

This way every page looks realistic from day one instead of staring at empty tables.

---

## What We're NOT Building Yet

- Real authentication (Supabase Auth)
- Online invoice payment links (Stripe)
- Public landing page
- Customer-facing booking page
- Customer-facing invoice portal
- Text/email notifications
- Estimates
- Appointments
- Production deployment polish

All of that comes after the UI is solid and Logan has used it enough to give feedback.
