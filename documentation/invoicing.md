# Invoicing & Payments

## What ShopMonkey Does

### Invoicing
- Generate invoices directly from approved estimates (auto-converted)
- Send invoices to customers via text or email with a payment link
- Customers can pay from their phone without coming into the shop
- Track invoice status (sent, viewed, paid, unpaid, partially paid)
- Supports partial payments

### Payment Methods
- Online payments via the customer's payment link (card, Apple Pay, Google Pay)
- In-person payments via ShopMonkey's own card reader ($249 hardware + $10/month/device)
- Buy Now, Pay Later option for larger jobs
- Cash payments logged manually

### Fees & Payouts
- Online transactions: 2.9% + $0.30 per transaction
- In-person transactions: 2.7% + $0.15 per transaction
- Payouts deposited to bank account within 2 business days
- No monthly fee for payment processing — pay per transaction only

### Accounting Integration
- QuickBooks Online integration — automatically syncs invoices and fees
- Tracks which QuickBooks bank account receives payouts
- Logs transaction fees to an expense account automatically

---

## What We Will Build

### Phase 1 — Core (MVP for Logan)

Phase 1 is internal only. Logan records payments that were received at the shop; customers do not pay through the app yet.

| Feature | Notes |
|---|---|
| Manual invoice creation | For jobs that didn't start as an estimate |
| Invoice status tracking | Unpaid, Partially Paid, Paid |
| Record cash payment | Log cash manually with date and amount |
| Record card payment (manual) | Log that a card was run externally (e.g. Square) |
| Receive payments against invoices | Apply one or more payments to an invoice until it is fully paid |
| Invoice history per customer | See all invoices tied to a customer |
| Printable invoice | Clean PDF that can be printed or emailed |
| Generate invoice from estimate | Later, after estimates are added |

### Phase 2 — Digital Payments

| Feature | Notes |
|---|---|
| Send invoice via text/email | Customer gets a link to pay online |
| Online payment processing | Integrate Stripe for card, Apple Pay, Google Pay |
| Payment confirmation | Auto-notify Logan when payment is received |
| Partial payments | Allow customers to pay a deposit upfront |
| Transaction fee display | Show Logan what he nets after processing fees |

### Phase 3 — Accounting

| Feature | Notes |
|---|---|
| Basic revenue reports | Total revenue by day, week, month |
| Sales reports | Sales totals by date range, invoice status, and payment method |
| QuickBooks export | CSV or direct sync for accountant use |
| Outstanding invoices report | See who owes what at a glance |

### What We're Skipping (for now)
- Our own card reader hardware — Logan can use Square or Stripe Terminal
- Buy Now Pay Later — niche for a small rural tire shop
- Automatic QuickBooks sync — a CSV export is good enough for Phase 1

---

## Payment Processing Plan (Our Approach)

Later, when we add customer-facing online payments, we'll use **Stripe** rather than building our own payment infrastructure like ShopMonkey did. This means:
- No hardware cost to Logan
- Standard Stripe rates (~2.9% + $0.30 online, ~2.7% + $0.05 in-person with Stripe Terminal)
- We collect a small platform fee on top if/when we scale to other shops

---

## Our Edge Over ShopMonkey
- ShopMonkey charges $249 + $10/month for their card reader — Logan can use hardware he already has
- No lock-in to a proprietary payment system
- Simpler invoice flow — Logan doesn't need 10 payment options on day one
