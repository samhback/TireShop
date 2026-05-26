# Inventory Management

## What ShopMonkey Does

### Stock Tracking
- Tracks tires and parts separately (different categories, not lumped together)
- View real-time stock levels for every item
- See what's on hand vs. what's currently assigned to open estimates/work orders
- Tracks stock across multiple shop locations

### Alerts & Reordering
- Low stock alerts — get notified when an item falls below a set threshold
- Set custom reorder points per item
- Generate purchase orders directly from within ShopMonkey
- Track the status of purchase orders (ordered, received, partially received)

### Supplier Integrations
- Integrated with TPI and ATD for tire ordering
- Integrated with PartsTech, Nexpart, and WORLDPAC for parts ordering
- Browse supplier catalogs, check pricing, and place orders without leaving the app
- Parts ordered from suppliers automatically attach to the relevant work order

### Pricing & Automation
- Automated markup rules — set a margin and ShopMonkey prices parts automatically
- Sync inventory costs with QuickBooks

---

## What We Will Build

### Phase 1 — Core (MVP for Logan)

| Feature | Notes |
|---|---|
| Tire inventory | Track by size, brand, quantity on hand |
| Parts inventory | Track by name, part number, quantity on hand |
| Part numbers | Required field for parts; optional field for tires if Logan uses tire-specific SKUs |
| Cost each & sell price each | Calculate margin per item |
| Low stock threshold | Logan sets a minimum qty per item |
| Low stock alert | Flag items that are at or below threshold |
| Add/remove stock manually | Log received shipments and used items |
| Attach inventory items to estimates | Pull from inventory when building an estimate, auto-deduct on invoice |

### Phase 2 — Purchase Orders & Ordering

| Feature | Notes |
|---|---|
| Purchase order creation | Create a PO for tires/parts to send to a supplier |
| PO status tracking | Ordered, Partially Received, Received |
| Receive inventory against a PO | Mark items received, auto-update stock levels |
| Supplier records | Store contact info for Logan's regular suppliers |

### Phase 3 — Advanced

| Feature | Notes |
|---|---|
| Markup rules | Set a default margin %, apply automatically |
| Inventory value report | Total value of current stock on hand |
| Parts usage history | See what's been used and when |

### What We're Skipping (for now)
- Live supplier catalog integrations (TPI, ATD, PartsTech) — too complex early on
- Multi-location inventory — Logan has one shop
- QuickBooks inventory sync — manual export is fine for now

---

## Our Edge Over ShopMonkey
- ShopMonkey's inventory system is built for multi-location chains — overkill for one shop
- Logan just needs to know what tires he has on the rack and when he's running low
- Logan specifically needs part numbers, pricing, and quantities easy to see in one place
- We'll keep the interface simple: a list of items, quantities, and a red flag when something's low
