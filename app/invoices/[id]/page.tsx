import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { markInvoicePaid } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    created?: string;
    paid?: string;
    error?: string;
  }>;
};

function money(value: { toString(): string } | number) {
  return Number(value.toString()).toFixed(2);
}

function vehicleLabel(vehicle: {
  year: string;
  make: string;
  model: string;
  color: string | null;
  licensePlate: string | null;
}) {
  return [
    vehicle.color,
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.licensePlate ? `Plate ${vehicle.licensePlate}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export default async function InvoicePage({ params, searchParams }: InvoicePageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const invoiceId = Number(id);

  if (!Number.isInteger(invoiceId)) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      vehicle: true,
      order: true,
      lineItems: {
        orderBy: {
          createdAt: "asc",
        },
      },
      payments: {
        orderBy: {
          receivedAt: "desc",
        },
      },
      customer: {
        include: {
          accountEntries: {
            orderBy: {
              entryDate: "desc",
            },
            take: 5,
          },
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const paramsValue = await searchParams;
  const isPaid = invoice.status === "paid";

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/orders/manage">
          Back to Manage Orders
        </Link>

        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Invoice</p>
            <h1>{invoice.invoiceNumber}</h1>
            <p className="helper">
              Created from order {invoice.order.orderNumber}. Generate, print, or mark payment status here.
            </p>
          </div>
          <Link
            className="secondary-link-button"
            href={`/invoices/${invoice.id}/print`}
            target="_blank"
          >
            Generate Invoice
          </Link>
        </div>

        {paramsValue?.created === "1" ? (
          <p className="success">Invoice created.</p>
        ) : null}
        {paramsValue?.paid === "1" ? (
          <p className="success">Invoice marked as paid.</p>
        ) : null}
        {paramsValue?.error === "payment" ? (
          <p className="error">Unable to update invoice payment status.</p>
        ) : null}

        <div className="order-summary-grid">
          <article className="order-summary-card">
            <span>Customer</span>
            <h2>
              {invoice.customer.firstName} {invoice.customer.lastName}
            </h2>
            <p>{invoice.customer.phone}</p>
            {invoice.order.isCompanyCar && invoice.order.companyNameSnapshot ? (
              <p>
                Company car: {invoice.order.companyNameSnapshot} (
                {money(invoice.order.companyMarkupPercent ?? 0)}% markup)
              </p>
            ) : null}
          </article>

          <article className="order-summary-card">
            <span>Vehicle</span>
            <h2>
              {invoice.vehicle ? vehicleLabel(invoice.vehicle) : "No vehicle attached"}
            </h2>
            <p>Status: {invoice.status}</p>
          </article>

          <article className="order-summary-card">
            <span>Payment</span>
            <h2>{isPaid ? "Paid" : "Unpaid"}</h2>
            {invoice.paidAt ? (
              <p>
                Marked paid {formatDateTime(invoice.paidAt)}
                {invoice.paidByUsername ? ` by ${invoice.paidByUsername}` : ""}
                {invoice.payments[0] ? ` via ${invoice.payments[0].method}` : ""}
              </p>
            ) : (
              <form action={markInvoicePaid}>
                <input name="invoiceId" type="hidden" value={invoice.id} />
                <label className="compact-payment-field">
                  Payment Method
                  <select name="paymentMethod" required>
                    <option value="">Choose method</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="check">Check</option>
                    <option value="account">Account</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="compact-payment-field">
                  Payment Purpose
                  <select name="paymentPurpose" required>
                    <option value="invoice">Paid on Invoice</option>
                    <option value="account">Paid on Account</option>
                    <option value="deposit">Deposit</option>
                    <option value="applied_credit">Applied Credit</option>
                  </select>
                </label>
                <button className="secondary-button" type="submit">
                  Mark as Paid
                </button>
              </form>
            )}
          </article>
        </div>

        {invoice.customer.accountEntries.length > 0 ? (
          <div className="form-section service-preview">
            <h2>Recent Account Activity</h2>
            <div className="compact-result-list">
              {invoice.customer.accountEntries.map((entry) => (
                <article className="customer-result-card" key={entry.id}>
                  <div className="customer-result-header">
                    <h3>{entry.entryType.replaceAll("_", " ")}</h3>
                    <strong>${money(entry.amount)}</strong>
                  </div>
                  <p>
                    {formatDateTime(entry.entryDate)}
                    {entry.description ? ` | ${entry.description}` : ""}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <div className="form-section service-preview">
          <h2>Invoice Items</h2>
          <div className="line-item-list">
            {invoice.lineItems.map((item) => (
              <article className="line-item-row" key={item.id}>
                <div>
                  <span className="role-label">{item.lineType}</span>
                  <h3>{item.description}</h3>
                  {item.notes ? <p>{item.notes}</p> : null}
                  {item.performedByName ? (
                    <p>Performed by {item.performedByName}</p>
                  ) : null}
                </div>

                <div className="line-item-amounts">
                  <div className="line-price-block">
                    <span>
                      {money(item.quantity)} x ${money(item.unitPrice)}
                    </span>
                    {item.complementary ? (
                      <span className="line-badge">Complementary</span>
                    ) : Number(item.discountPercent.toString()) > 0 ? (
                      <span className="line-badge">
                        {money(item.discountPercent)}% off
                      </span>
                    ) : null}
                    <strong>${money(item.lineTotal)}</strong>
                  </div>
                </div>
              </article>
            ))}

            <div className="order-total-row">
              <div className="invoice-total-stack">
                <span>Subtotal: ${money(invoice.subtotal)}</span>
                <span>Tax: ${money(invoice.taxAmount)}</span>
                <strong>Total: ${money(invoice.total)}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
