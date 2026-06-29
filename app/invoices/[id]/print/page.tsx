import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { formatTaxRatePercent } from "@/lib/tax";
import { PrintButton } from "./PrintButton";

type InvoicePrintPageProps = {
  params: Promise<{
    id: string;
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
  vin: string | null;
}) {
  return [
    vehicle.color,
    vehicle.year,
    vehicle.make,
    vehicle.model,
    vehicle.licensePlate ? `Plate ${vehicle.licensePlate}` : null,
    vehicle.vin ? `VIN ${vehicle.vin}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
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
      customer: true,
      vehicle: true,
      order: {
        include: {
          quotedByEmployee: true,
        },
      },
      lineItems: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const generatedAt = new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());

  return (
    <main className="quote-print-shell">
      <div className="quote-screen-actions">
        <PrintButton />
      </div>

      <section className="quote-document">
        <header className="quote-header">
          <div>
            <p className="eyebrow">Healdton Service Center</p>
            <p className="shop-address">
              <strong>Billing Address:</strong> 10202 SH-76, Healdton, Oklahoma
            </p>
            <h1>Invoice</h1>
            <p>{invoice.invoiceNumber}</p>
          </div>
          <div className="quote-meta">
            <span>Generated</span>
            <strong>{generatedAt}</strong>
            <span>Status</span>
            <strong>{invoice.status}</strong>
            {invoice.paidAt ? (
              <>
                <span>Paid</span>
                <strong>
                  {new Intl.DateTimeFormat("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(invoice.paidAt)}
                </strong>
              </>
            ) : null}
            <span>Order</span>
            <strong>{invoice.order.orderNumber}</strong>
            {invoice.order.isCompanyCar && invoice.order.companyNameSnapshot ? (
              <>
                <span>Company</span>
                <strong>{invoice.order.companyNameSnapshot}</strong>
              </>
            ) : null}
          </div>
        </header>

        <div className="quote-info-grid">
          <section>
            <h2>Customer</h2>
            <p>
              <strong>
                {invoice.customer.firstName} {invoice.customer.lastName}
              </strong>
            </p>
            <p>{invoice.customer.phone}</p>
            {invoice.customer.email ? <p>{invoice.customer.email}</p> : null}
          </section>

          <section>
            <h2>Vehicle</h2>
            {invoice.vehicle ? (
              <p>{vehicleLabel(invoice.vehicle)}</p>
            ) : (
              <p>No vehicle attached.</p>
            )}
            {invoice.order.quotedByEmployee ? (
              <p>Quoted by {invoice.order.quotedByEmployee.name}</p>
            ) : null}
          </section>
        </div>

        <table className="quote-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit</th>
              <th>Adjustment</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{item.description}</strong>
                  {item.notes ? <span>{item.notes}</span> : null}
                  {item.performedByName ? (
                    <span>Performed by {item.performedByName}</span>
                  ) : null}
                </td>
                <td>{money(item.quantity)}</td>
                <td>${money(item.unitPrice)}</td>
                <td>
                  {item.complementary
                    ? "Complementary"
                    : Number(item.discountPercent.toString()) > 0
                      ? `${money(item.discountPercent)}% off`
                      : "-"}
                </td>
                <td>${money(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="quote-total">
          <span>Subtotal</span>
          <strong>${money(invoice.subtotal)}</strong>
        </div>
        <div className="quote-total quote-total-secondary">
          <span>Sales Tax ({formatTaxRatePercent(invoice.taxRate)}%)</span>
          <strong>${money(invoice.taxAmount)}</strong>
        </div>
        <div className="quote-total">
          <span>Total Due</span>
          <strong>${money(invoice.total)}</strong>
        </div>

        <footer className="quote-footer">
          <p>
            Thank you for choosing Healdton Service Center. Payment tracking will be added to
            the system in a later step.
          </p>
        </footer>
      </section>
    </main>
  );
}
