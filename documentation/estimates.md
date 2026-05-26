# Estimates & Quotes

## What ShopMonkey Does

### Building an Estimate
- Add line items for parts, labor, tires, and fees separately
- Pull parts pricing directly from integrated suppliers (PartsTech, Nexpart, WORLDPAC) without leaving the app
- Pre-built service packages (e.g. tire rotation + balance bundle) to speed up common jobs
- Add previously declined services to an existing estimate to upsell
- Attach notes to individual line items or the estimate as a whole
- Estimates are linked to a specific customer and vehicle

### Sending & Approval
- Send estimates to customers via text or email digitally
- Customer can approve or decline from their phone — no phone call needed
- Track approval status (sent, viewed, approved, declined)
- Once approved, estimate converts directly into a work order

### Estimate Management
- See all open, approved, and declined estimates in one view
- Track which estimates are waiting on customer approval
- Declined services stay on record and can be re-added to future estimates

---

## What We Will Build

### Phase 1 — Core (MVP for Logan)

| Feature | Notes |
|---|---|
| Create estimate | Linked to a customer and vehicle |
| Line items | Add tires, parts, labor, and fees as separate line items |
| Quantity & price per item | With automatic subtotal calculation |
| Tax calculation | Apply a tax rate to get the final total |
| Notes field | Per line item and for the overall estimate |
| Estimate status | Draft, Sent, Approved, Declined |
| Convert to invoice | One-click conversion once approved |

### Phase 2 — Sending & Approval

| Feature | Notes |
|---|---|
| Send via text or email | Customer gets a link to view the estimate |
| Customer approval page | Simple page where customer can approve or decline |
| Approval notification | Logan gets notified when a customer approves |
| Declined services log | Track what was declined for future upsell opportunities |

### Phase 3 — Power Features

| Feature | Notes |
|---|---|
| Pre-built service packages | Logan can define common jobs (e.g. "Mount & Balance 4 tires") |
| Parts price lookup | Eventually integrate a parts catalog or supplier API |

### What We're Skipping (for now)
- Live supplier integrations (PartsTech, Nexpart) — too complex for MVP
- Multi-location inventory tied to estimates
- Automated upsell prompts (we'll handle this manually for Logan)

---

## Our Edge Over ShopMonkey
- No learning curve — estimate builder will be dead simple
- Logan doesn't need 12 supplier integrations, just a clean form he can fill out fast
- Faster to build an estimate than navigating ShopMonkey's feature-heavy UI
