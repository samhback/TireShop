import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { QuickInvoiceForm } from "./QuickInvoiceForm";

type QuickInvoicePageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function QuickInvoicePage({
  searchParams,
}: QuickInvoicePageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;

  const [employees, services, inventoryItems] = await Promise.all([
    prisma.employeeProfile.findMany({
      orderBy: {
        name: "asc",
      },
    }),
    prisma.serviceItem.findMany({
      where: {
        active: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 100,
    }),
    prisma.inventoryItem.findMany({
      where: {
        quantity: {
          gt: 0,
        },
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      take: 100,
    }),
  ]);

  const employeeOptions = employees.map((profile) => ({
    id: profile.id,
    name: profile.name,
  }));

  const serviceOptions = services.map((service) => ({
    id: service.id,
    category: service.category,
    name: service.name,
    pricingMethod: service.pricingMethod,
    flatPrice: service.flatPrice?.toString() ?? null,
    hourlyRate: service.hourlyRate?.toString() ?? null,
    estimatedHours: service.estimatedHours?.toString() ?? null,
  }));

  const inventoryOptions = inventoryItems.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    brand: item.brand,
    partNumber: item.partNumber,
    tireSize: item.tireSize,
    quantity: item.quantity,
    sellPrice: item.sellPrice.toString(),
  }));

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/invoices">
          Back to Invoices
        </Link>

        <p className="eyebrow">Invoices</p>
        <h1>Quick Create Invoice</h1>
        <p className="helper">
          Create a completed order and invoice in one step for simple walk-in sales.
        </p>

        {params?.error === "invalid" ? (
          <p className="error">
            Enter a customer name, choose who quoted it, and add at least one service or inventory item.
          </p>
        ) : null}
        {params?.error === "inventory" ? (
          <p className="error">
            One or more inventory quantities are no longer available.
          </p>
        ) : null}

        <QuickInvoiceForm
          employees={employeeOptions}
          inventoryItems={inventoryOptions}
          services={serviceOptions}
        />
      </section>
    </main>
  );
}
