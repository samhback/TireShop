# Pages

## Navigation Structure

The app has two zones:
- **Login** — only the login page, no sidebar
- **Internal** — everything else, wrapped in a shared layout with a left sidebar

For now, there is no customer-facing side. The app opens to the login screen and every operational page is internal to Healdton Service Center.

### Sidebar Links (visible on every protected page)
- Dashboard
- Inventory
- Customers
- Invoices
- Reports

---

## Deferred Public Pages

### Home (Landing Page)
**URL:** `/`
**Status:** Deferred. Do not build for the current internal MVP.

For now, `/` should redirect to `/login` or render the same login screen.

---

### Login
**URL:** `/login`
**How to get here:** Default route for the current internal MVP, or visiting any internal page while logged out.

- Username + password form
- Submit checks against hard-coded credentials
- On success → redirect to `/dashboard`
- On fail → inline error message ("Invalid credentials")

---

## Protected Pages

---

### Dashboard
**URL:** `/dashboard`
**How to get here:** Sidebar → Dashboard. Also the default landing page after login.

- Outstanding invoices — count + total dollar amount owed
- Low stock alerts — list of inventory items at or below their threshold
- Today's sales — total payments received today
- Recent customers — last 5 customers with activity

Each widget links to its respective internal section.

---

### Invoices

#### Invoice List
**URL:** `/invoices`
**How to get here:** Sidebar → Invoices

- Table of all invoices: customer name, vehicle, date, total, amount paid, status
- Filter by status (Unpaid, Partially Paid, Paid)
- "New Invoice" button → goes to New Invoice page (manual invoice, no estimate)
- Click any row → goes to Invoice Detail

#### New Invoice (Manual)
**URL:** `/invoices/new`
**How to get here:** "New Invoice" button on `/invoices`

- Invoice form with customer, vehicle, line items, tax, total, and notes
- For jobs that need to be billed directly
- Customer, vehicle, line items, tax, total, notes
- Save → creates invoice with status Unpaid, redirects to `/invoices/[id]`

#### Invoice Detail
**URL:** `/invoices/[id]`
**How to get here:** Click any invoice on `/invoices` or from a Customer Profile

- Full clean invoice view (styled for printing)
- "Record Payment" button → opens a modal to log a payment
  - Fields: amount, payment method (Cash / Card), date, notes
  - Supports partial payments — can record multiple payments
  - Status auto-updates to Partially Paid or Paid based on total paid vs. total owed
- Payment history (list of all payments recorded against this invoice)
- "Print" button → opens print dialog with clean invoice layout
- Link to customer profile

---

### Inventory

#### Inventory List
**URL:** `/inventory`
**How to get here:** Sidebar → Inventory

- Two tabs: **Tires** | **Parts**
- Table: name, brand/size, part number, qty on hand, cost each, sell price each, low stock threshold
- Items at or below threshold highlighted in red
- Search/filter by name or brand
- "Add Item" button → opens Add Item modal
- Click any row → opens Edit Item modal

#### Add / Edit Item (Modal)
**How to get here:** "Add Item" button or clicking a row on `/inventory`

- Fields: type (tire or part), name, brand, size (tires only), part number, qty on hand, cost each, sell price each, low stock threshold, notes
- Save → updates list, closes modal
- Delete (edit mode only, with confirmation)

---

### Customers

#### Customer List
**URL:** `/customers`
**How to get here:** Sidebar → Customers

- Searchable table: name, phone, email, number of vehicles, last visit date
- "New Customer" button → opens New Customer modal
- Click any row → goes to Customer Profile

#### New Customer (Modal)
**How to get here:** "New Customer" button on `/customers`

- Fields: first name, last name, phone, email, notes
- Save → creates customer, closes modal, customer appears in list

#### Customer Profile
**URL:** `/customers/[id]`
**How to get here:** Click any customer on `/customers` or from Invoice Detail

- Customer info (name, phone, email, notes) — editable inline
- **Vehicles section** — list of all vehicles for this customer
  - Each vehicle: year, make, model, license plate, VIN
  - "Add Vehicle" button → opens Add Vehicle modal
  - Click a vehicle → goes to Vehicle Detail
- **Service History section** — all maintenance logs and invoices across all their vehicles, newest first
  - Shows date, vehicle, service summary, total, status
  - Click any invoice row → goes to the invoice detail page

#### Add Vehicle (Modal)
**How to get here:** "Add Vehicle" on a Customer Profile

- Fields: year, make, model, VIN, license plate, color, notes
- VIN field has a "Decode" button → auto-fills year, make, model from the VIN
- Save → adds vehicle to customer profile, closes modal

#### Vehicle Detail
**URL:** `/customers/[id]/vehicles/[vehicleId]`
**How to get here:** Click a vehicle on a Customer Profile

- Vehicle info (year, make, model, VIN, plate) — editable inline
- Mileage log — list of mileage entries recorded at each visit, newest first
  - "Add Mileage Entry" → date + mileage fields
- Maintenance log — dated notes for work performed, mileage, and related invoice
- Full service history for this specific vehicle (invoices + maintenance log)

---

### Reports

#### Sales Reports
**URL:** `/reports`
**How to get here:** Sidebar → Reports

- Date range filter: Today, This Week, This Month, Custom
- Total sales for the selected range
- Payments received for the selected range
- Outstanding unpaid invoice balance
- Partially paid invoice balance
- Breakdown by payment method: cash, card, other/manual
- Table of invoices included in the report: invoice number, customer, vehicle, date, total, paid, balance, status
- Export button for CSV bookkeeping export

---

## Deferred Internal Pages

Appointments and estimates are useful later, but they are not the first focus. The current MVP should prioritize Logan's stated requirements: inventory, reports, customers, vehicles, maintenance logs, invoices, and invoice payments.

### Appointments

#### Appointment List
**URL:** `/appointments`
**Status:** Deferred.

- Week calendar view
- List view of upcoming appointments
- Filter by status
- Create, edit, cancel, and complete appointments

#### Appointment Detail
**URL:** `/appointments/[id]`
**Status:** Deferred.

- Full view of appointment details
- Link to the associated customer profile
- Option to create an estimate later

---

### Estimates

#### Estimate List
**URL:** `/estimates`
**Status:** Deferred.

- Table of estimates by customer, vehicle, date, total, and status
- Filter by status
- Create and edit estimates

#### Estimate Detail
**URL:** `/estimates/[id]`
**Status:** Deferred.

- Full read view of the estimate
- Status control
- Convert approved estimate to invoice

---

## URL Summary

| Page | URL |
|---|---|
| Login Redirect / Login | `/` |
| Login | `/login` |
| Dashboard | `/dashboard` |
| Invoice List | `/invoices` |
| New Invoice | `/invoices/new` |
| Invoice Detail | `/invoices/[id]` |
| Inventory | `/inventory` |
| Customer List | `/customers` |
| Customer Profile | `/customers/[id]` |
| Vehicle Detail | `/customers/[id]/vehicles/[vehicleId]` |
| Reports | `/reports` |
