# Appointments

## What ShopMonkey Does

### Scheduling
- Calendar view for all appointments
- Create new appointments manually from the calendar or directly from an estimate
- Set drop-off and pick-up times separately
- Recurring appointments (repeat checkbox)
- Color-code appointments (by service type, customer type, etc.)
- Assign a technician to an appointment
- Add notes to an appointment
- Link appointments to a work order

### Online Customer Booking
- Customers can self-book through a scheduling widget embedded on the shop's website
- Shop can control which services are available for online booking
- Shop sets available hours and time blocks per service
- Minimum notice required for bookings (e.g. can't book same-day)
- Future scheduling cutoff (e.g. can't book more than 60 days out)
- Optional "describe your issue" freeform field if no service matches
- Customer vehicle and address fields can be toggled hidden, optional, or required

### Reminders & Confirmations
- Automatic confirmation sent when appointment is booked
- Automated reminders via text and/or email before the appointment
- Reportedly reduces no-shows by up to 75%

---

## What We Will Build

### Phase 1 — Core (MVP for Logan)

| Feature | Notes |
|---|---|
| Calendar view | Day and week view at minimum |
| Create/edit appointments | Manually by shop staff |
| Drop-off & pick-up times | Two separate time fields per appointment |
| Link to customer record | Pull existing customer or create new one |
| Link to vehicle | Attach vehicle to the appointment |
| Notes field | Free text for any special instructions |
| Assign to technician | Simple dropdown |
| Appointment status | e.g. Scheduled, In Progress, Complete, No-Show |

### Phase 2 — Customer-Facing Booking

| Feature | Notes |
|---|---|
| Online booking page | Shareable link or embeddable widget |
| Service selection | Shop defines available services and time slots |
| Business hours config | Shop sets when they're open |
| Minimum notice setting | Prevent last-minute bookings |
| Auto confirmation text/email | Sent immediately on booking |
| Appointment reminder | Sent 24 hours before |

### What We're Skipping (for now)
- Color-coding appointments (nice to have, not essential)
- Recurring appointments (Logan's shop is mostly one-off visits)
- Freeform "describe your issue" booking (keep it simple)
- Future cutoff date settings (can hard-code a reasonable default)

---

## Our Edge Over ShopMonkey

- No $10,000 onboarding fee — zero setup cost
- No bloat — Logan only sees what's relevant to a small tire shop
- Built around his actual workflow, not a generic auto shop template
