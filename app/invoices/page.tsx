import Link from "next/link";
import { redirect } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { InvoiceList } from "./InvoiceList";

type InvoicesPageProps = {
  searchParams?: Promise<{
    deleted?: string;
  }>;
};

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const query = await searchParams;

  const invoices = await prisma.invoice.findMany({
    include: {
      customer: true,
      vehicle: true,
      order: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  const defaultInvoices = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    orderNumber: invoice.order.orderNumber,
    status: invoice.status,
    total: invoice.total.toString(),
    createdAt: invoice.createdAt.toISOString(),
    paidAt: invoice.paidAt?.toISOString() ?? null,
    paidByUsername: invoice.paidByUsername,
    customer: {
      firstName: invoice.customer.firstName,
      lastName: invoice.customer.lastName,
      phone: invoice.customer.phone,
    },
    vehicle: invoice.vehicle
      ? {
          year: invoice.vehicle.year,
          make: invoice.vehicle.make,
          model: invoice.vehicle.model,
          color: invoice.vehicle.color,
          licensePlate: invoice.vehicle.licensePlate,
        }
      : null,
  }));

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <p className="eyebrow">Invoices</p>
        <h1>Invoices</h1>
        <p className="helper">
          Search completed order invoices by customer, vehicle, invoice number, or order number.
        </p>

        {query?.deleted === "1" ? (
          <p className="success">Invoice deleted.</p>
        ) : null}

        <div className="section-grid section-grid-single">
          <Link className="section-card" href="/invoices/quick">
            <span className="dashboard-icon" aria-hidden="true">
              <FilePlus2 size={26} strokeWidth={2.2} />
            </span>
            <span className="dashboard-card-text">
              <strong>Quick Create Invoice</strong>
              <span>Create an invoice from customer name, quoted by, services, and inventory used.</span>
            </span>
          </Link>
        </div>

        <InvoiceList defaultInvoices={defaultInvoices} />
      </section>
    </main>
  );
}
