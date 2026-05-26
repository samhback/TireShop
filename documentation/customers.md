# Customer Records & Vehicle History

## What ShopMonkey Does

### Customer Profiles
- Store customer contact info (name, phone, email, address)
- Every repair, estimate, and invoice is logged to the customer's profile automatically
- Searchable from a global "Search Everything" bar across the entire app
- Two-way text messaging with customers directly inside ShopMonkey
- Send photos and digital inspection results via text

### Vehicle Records
- Attach one or more vehicles to a customer profile
- VIN decoding — enter a VIN and ShopMonkey auto-fills year, make, model, engine
- CARFAX integration — pull full vehicle history report from within the app
- Track mileage at each visit
- Full service history per vehicle (every job ever done on that car)

### Communication & Follow-Up
- Automated service reminders (e.g. "it's been 6 months, time to rotate your tires")
- Appointment reminders tied to customer profile
- Customers can message the shop and receive updates via text

### Reputation Management
- Tools to solicit Google reviews from satisfied customers
- Track online reputation from within the dashboard

---

## What We Will Build

### Phase 1 — Core (MVP for Logan)

| Feature | Notes |
|---|---|
| Customer profile | Name, phone, email, notes |
| Multiple vehicles per customer | Most customers have more than one vehicle |
| Vehicle details | Year, make, model, license plate, VIN |
| VIN decode | Auto-fill vehicle details from VIN lookup (free APIs available) |
| Mileage log | Record mileage at each visit |
| Maintenance log | Date, mileage, service performed, notes, related estimate/invoice |
| Full service history per vehicle | Every estimate, invoice, maintenance note, and job tied to the vehicle |
| Search customers | Find by name, phone, or license plate quickly |
| Notes on customer profile | Flag things like "always asks for alignment check" |

### Phase 2 — Communication

| Feature | Notes |
|---|---|
| Text customers from the app | Send job updates, invoice links, and appointment reminders |
| Automated follow-up reminders | "It's been X months, time for a rotation" based on last visit date |
| Appointment reminder texts | Tied to the appointments module |

### Phase 3 — Advanced

| Feature | Notes |
|---|---|
| Review request | Send a text after job completion asking for a Google review |
| Customer lifetime value | Total revenue generated per customer |
| Vehicle service interval tracking | Flag when a vehicle is due for common services based on mileage |

### What We're Skipping (for now)
- CARFAX integration — costs money per lookup, not worth it for MVP
- Two-way in-app messaging thread UI — Phase 2 at earliest
- Reputation dashboard — Logan can check Google Reviews directly

---

## Why Vehicle History Matters for a Tire Shop

In a rural area, Logan will see the same customers over and over. Knowing that a customer's truck came in 8 months ago for a full set of tires, and the left rear was showing uneven wear, is the kind of context that builds trust and lets him give better service. ShopMonkey buries this in a complex UI. We should surface maintenance logs and service history front and center on every customer and vehicle page.

---

## Our Edge Over ShopMonkey
- ShopMonkey's CRM is designed for shops with marketing teams and volume — Logan just needs to know who his customers are and what he's done for them
- We'll make the vehicle history the most visible thing on the customer page — one scroll and Logan sees everything
- Free VIN decode API (NHTSA offers one at no cost) vs. ShopMonkey's paid integrations
