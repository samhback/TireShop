import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";

type VehicleHistoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function money(value: { toString(): string } | number) {
  return Number(value.toString()).toFixed(2);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(value);
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

export default async function VehicleHistoryPage({ params }: VehicleHistoryPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const vehicleId = Number(id);

  if (!Number.isInteger(vehicleId)) {
    notFound();
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: {
      id: vehicleId,
    },
    include: {
      customer: true,
      invoices: {
        include: {
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
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!vehicle) {
    notFound();
  }

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href={`/customers/${vehicle.customerId}/edit`}>
          Back to Customer
        </Link>

        <p className="eyebrow">Vehicle History</p>
        <h1>{vehicleLabel(vehicle)}</h1>
        <p className="helper">
          Work history for {vehicle.customer.firstName} {vehicle.customer.lastName}.
        </p>

        {vehicle.invoices.length > 0 ? (
          <div className="vehicle-history-list">
            {vehicle.invoices.map((invoice) => (
              <article className="vehicle-history-card" key={invoice.id}>
                <div className="section-heading-row">
                  <div>
                    <p className="eyebrow">{formatDate(invoice.createdAt)}</p>
                    <h2>{invoice.invoiceNumber}</h2>
                    <p>
                      Order {invoice.order.orderNumber}
                      {invoice.order.quotedByEmployee
                        ? ` | Quoted by ${invoice.order.quotedByEmployee.name}`
                        : ""}
                    </p>
                  </div>
                  <Link
                    className="secondary-link-button"
                    href={`/invoices/${invoice.id}`}
                  >
                    Open Invoice
                  </Link>
                </div>

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
                          <strong>${money(item.lineTotal)}</strong>
                        </div>
                      </div>
                    </article>
                  ))}

                  <div className="order-total-row">
                    <span>Total</span>
                    <strong>${money(invoice.total)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h2>No vehicle history yet</h2>
            <p>Completed invoices for this vehicle will show here.</p>
          </div>
        )}
      </section>
    </main>
  );
}
