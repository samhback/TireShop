import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { PrintButton } from "../PrintButton";

type ReportPageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    start?: string;
    end?: string;
    q?: string;
  }>;
};

type InvoiceWithDetails = Prisma.InvoiceGetPayload<{
  include: {
    customer: true;
    vehicle: true;
    order: {
      include: {
        quotedByEmployee: true;
        lineItems: {
          include: {
            inventoryItem: true;
            performedByEmployee: true;
          };
        };
      };
    };
    lineItems: true;
  };
}>;

const reportTitles: Record<string, string> = {
  "revenue": "Revenue Report",
  "profit": "Profit Report",
  "inventory-used": "Inventory Used Report",
  "low-stock": "Low Stock Report",
  "employee-revenue": "Employee Revenue Report",
  "service-performed": "Service Performed Report",
  "unpaid-invoices": "Unpaid Invoices Report",
  "customer-activity": "Customer Activity Report",
  "vehicle-history": "Vehicle History Report",
  "average-repair-order": "Average Repair Order Report",
};

function money(value: number) {
  return value.toFixed(2);
}

function decimal(value: { toString(): string } | number | null | undefined) {
  return Number(value?.toString() ?? 0);
}

function dateValue(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function endDateValue(value: string | undefined, fallback: Date) {
  const date = dateValue(value, fallback);
  date.setHours(23, 59, 59, 999);
  return date;
}

function inputDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function customerName(invoice: Pick<InvoiceWithDetails, "customer">) {
  return `${invoice.customer.firstName} ${invoice.customer.lastName}`;
}

function vehicleLabel(vehicle: InvoiceWithDetails["vehicle"]) {
  if (!vehicle) {
    return "No vehicle";
  }

  return [vehicle.color, vehicle.year, vehicle.make, vehicle.model]
    .filter(Boolean)
    .join(" ");
}

function reportRange(searchParams: Awaited<ReportPageProps["searchParams"]>) {
  const now = new Date();
  const defaultStart = new Date(now);
  defaultStart.setDate(now.getDate() - 30);

  const start = dateValue(searchParams?.start, defaultStart);
  const end = endDateValue(searchParams?.end, now);

  return { start, end };
}

async function getInvoices(start: Date, end: Date) {
  return prisma.invoice.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      customer: true,
      vehicle: true,
      order: {
        include: {
          quotedByEmployee: true,
          lineItems: {
            include: {
              inventoryItem: true,
              performedByEmployee: true,
            },
          },
        },
      },
      lineItems: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

function DateFilter({ end, start }: { end: Date; start: Date }) {
  return (
    <form className="report-filter print-hidden">
      <label>
        Start
        <input name="start" type="date" defaultValue={inputDate(start)} />
      </label>
      <label>
        End
        <input name="end" type="date" defaultValue={inputDate(end)} />
      </label>
      <button className="secondary-button" type="submit">
        Run Report
      </button>
    </form>
  );
}

function SearchFilter({ defaultValue }: { defaultValue: string }) {
  return (
    <form className="report-filter print-hidden">
      <label>
        Search
        <input
          name="q"
          placeholder="Customer, vehicle, plate, VIN, invoice..."
          defaultValue={defaultValue}
        />
      </label>
      <button className="secondary-button" type="submit">
        Search
      </button>
    </form>
  );
}

function MetricGrid({ metrics }: { metrics: { label: string; value: string }[] }) {
  return (
    <div className="report-metric-grid">
      {metrics.map((metric) => (
        <article className="report-metric" key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </article>
      ))}
    </div>
  );
}

function ReportTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>No results for this report.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function revenueReport(invoices: InvoiceWithDetails[]) {
  const invoiced = invoices.reduce((sum, invoice) => sum + decimal(invoice.total), 0);
  const paid = invoices
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + decimal(invoice.total), 0);
  const serviceRevenue = invoices.reduce(
    (sum, invoice) =>
      sum +
      invoice.lineItems
        .filter((line) => line.lineType === "service")
        .reduce((lineSum, line) => lineSum + decimal(line.lineTotal), 0),
    0,
  );
  const inventoryRevenue = invoices.reduce(
    (sum, invoice) =>
      sum +
      invoice.lineItems
        .filter((line) => line.lineType === "inventory")
        .reduce((lineSum, line) => lineSum + decimal(line.lineTotal), 0),
    0,
  );

  return (
    <>
      <MetricGrid
        metrics={[
          { label: "Total Invoiced", value: `$${money(invoiced)}` },
          { label: "Total Paid", value: `$${money(paid)}` },
          { label: "Unpaid Balance", value: `$${money(invoiced - paid)}` },
          { label: "Invoice Count", value: String(invoices.length) },
          { label: "Service Revenue", value: `$${money(serviceRevenue)}` },
          { label: "Inventory Revenue", value: `$${money(inventoryRevenue)}` },
        ]}
      />
      <ReportTable
        columns={["Invoice", "Customer", "Vehicle", "Status", "Total", "Created"]}
        rows={invoices.map((invoice) => [
          invoice.invoiceNumber,
          customerName(invoice),
          vehicleLabel(invoice.vehicle),
          invoice.status,
          `$${money(decimal(invoice.total))}`,
          formatDate(invoice.createdAt),
        ])}
      />
    </>
  );
}

function profitReport(invoices: InvoiceWithDetails[]) {
  const inventoryLines = invoices.flatMap((invoice) => invoice.order.lineItems).filter(
    (line) => line.lineType === "inventory",
  );
  const serviceRevenue = invoices
    .flatMap((invoice) => invoice.lineItems)
    .filter((line) => line.lineType === "service")
    .reduce((sum, line) => sum + decimal(line.lineTotal), 0);
  const inventoryRevenue = inventoryLines.reduce(
    (sum, line) => sum + decimal(line.lineTotal),
    0,
  );
  const inventoryCost = inventoryLines.reduce(
    (sum, line) => sum + decimal(line.quantity) * decimal(line.inventoryItem?.cost),
    0,
  );
  const grossProfit = serviceRevenue + inventoryRevenue - inventoryCost;
  const grossMargin =
    serviceRevenue + inventoryRevenue > 0
      ? (grossProfit / (serviceRevenue + inventoryRevenue)) * 100
      : 0;

  return (
    <>
      <p className="report-note">
        Inventory profit uses the current stored inventory cost. Historical cost tracking can be added later.
      </p>
      <MetricGrid
        metrics={[
          { label: "Service Revenue", value: `$${money(serviceRevenue)}` },
          { label: "Inventory Revenue", value: `$${money(inventoryRevenue)}` },
          { label: "Inventory Cost", value: `$${money(inventoryCost)}` },
          { label: "Estimated Gross Profit", value: `$${money(grossProfit)}` },
          { label: "Gross Margin", value: `${money(grossMargin)}%` },
        ]}
      />
      <ReportTable
        columns={["Item", "Qty", "Revenue", "Est. Cost", "Est. Profit"]}
        rows={inventoryLines.map((line) => {
          const revenue = decimal(line.lineTotal);
          const cost = decimal(line.quantity) * decimal(line.inventoryItem?.cost);

          return [
            line.description,
            money(decimal(line.quantity)),
            `$${money(revenue)}`,
            `$${money(cost)}`,
            `$${money(revenue - cost)}`,
          ];
        })}
      />
    </>
  );
}

function inventoryUsedReport(invoices: InvoiceWithDetails[]) {
  const rows = new Map<
    string,
    { category: string; name: string; quantity: number; revenue: number; cost: number }
  >();

  invoices.flatMap((invoice) => invoice.order.lineItems).forEach((line) => {
    if (line.lineType !== "inventory") {
      return;
    }

    const key = `${line.inventoryItemId ?? line.description}`;
    const existing = rows.get(key) ?? {
      category: line.inventoryItem?.category ?? "Unknown",
      name: line.description,
      quantity: 0,
      revenue: 0,
      cost: 0,
    };
    const quantity = decimal(line.quantity);

    existing.quantity += quantity;
    existing.revenue += decimal(line.lineTotal);
    existing.cost += quantity * decimal(line.inventoryItem?.cost);
    rows.set(key, existing);
  });

  const reportRows = [...rows.values()].sort((a, b) => b.revenue - a.revenue);

  return (
    <ReportTable
      columns={["Category", "Item", "Qty Used", "Revenue", "Est. Cost", "Est. Profit"]}
      rows={reportRows.map((row) => [
        row.category,
        row.name,
        money(row.quantity),
        `$${money(row.revenue)}`,
        `$${money(row.cost)}`,
        `$${money(row.revenue - row.cost)}`,
      ])}
    />
  );
}

async function lowStockReport() {
  const items = await prisma.inventoryItem.findMany({
    where: {
      quantity: {
        lte: prisma.inventoryItem.fields.lowStockThreshold,
      },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <ReportTable
      columns={["Category", "Item", "Part #", "Qty", "Reorder At", "Location"]}
      rows={items.map((item) => [
        item.category,
        item.name,
        item.partNumber ?? "",
        item.quantity,
        item.lowStockThreshold,
        item.storageLocation ?? "",
      ])}
    />
  );
}

function employeeRevenueReport(invoices: InvoiceWithDetails[]) {
  const rows = new Map<string, { invoiceCount: number; revenue: number }>();

  invoices.forEach((invoice) => {
    const employee = invoice.order.quotedByEmployee?.name ?? "Unassigned";
    const existing = rows.get(employee) ?? { invoiceCount: 0, revenue: 0 };
    existing.invoiceCount += 1;
    existing.revenue += decimal(invoice.total);
    rows.set(employee, existing);
  });

  return (
    <ReportTable
      columns={["Employee", "Invoices", "Revenue"]}
      rows={[...rows.entries()]
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([employee, row]) => [
          employee,
          row.invoiceCount,
          `$${money(row.revenue)}`,
        ])}
    />
  );
}

function servicePerformedReport(invoices: InvoiceWithDetails[]) {
  const rows = new Map<string, { count: number; revenue: number }>();

  invoices.flatMap((invoice) => invoice.lineItems).forEach((line) => {
    if (line.lineType !== "service") {
      return;
    }

    const employee = line.performedByName ?? "Unassigned";
    const existing = rows.get(employee) ?? { count: 0, revenue: 0 };
    existing.count += 1;
    existing.revenue += decimal(line.lineTotal);
    rows.set(employee, existing);
  });

  return (
    <ReportTable
      columns={["Employee", "Services", "Service Revenue"]}
      rows={[...rows.entries()]
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .map(([employee, row]) => [employee, row.count, `$${money(row.revenue)}`])}
    />
  );
}

function unpaidInvoicesReport(invoices: InvoiceWithDetails[]) {
  const unpaid = invoices.filter((invoice) => invoice.status !== "paid");
  const total = unpaid.reduce((sum, invoice) => sum + decimal(invoice.total), 0);

  return (
    <>
      <MetricGrid
        metrics={[
          { label: "Unpaid Invoices", value: String(unpaid.length) },
          { label: "Open Balance", value: `$${money(total)}` },
        ]}
      />
      <ReportTable
        columns={["Invoice", "Customer", "Vehicle", "Balance", "Created", "Age"]}
        rows={unpaid.map((invoice) => {
          const age = Math.floor(
            (Date.now() - new Date(invoice.createdAt).getTime()) / 86400000,
          );

          return [
            invoice.invoiceNumber,
            customerName(invoice),
            vehicleLabel(invoice.vehicle),
            `$${money(decimal(invoice.total))}`,
            formatDate(invoice.createdAt),
            `${age} day${age === 1 ? "" : "s"}`,
          ];
        })}
      />
    </>
  );
}

function customerActivityReport(invoices: InvoiceWithDetails[]) {
  const rows = new Map<
    number,
    { name: string; phone: string; count: number; revenue: number; lastVisit: Date }
  >();

  invoices.forEach((invoice) => {
    const existing = rows.get(invoice.customerId) ?? {
      name: customerName(invoice),
      phone: invoice.customer.phone,
      count: 0,
      revenue: 0,
      lastVisit: invoice.createdAt,
    };
    existing.count += 1;
    existing.revenue += decimal(invoice.total);
    existing.lastVisit =
      invoice.createdAt > existing.lastVisit ? invoice.createdAt : existing.lastVisit;
    rows.set(invoice.customerId, existing);
  });

  return (
    <ReportTable
      columns={["Customer", "Phone", "Invoices", "Revenue", "Last Visit"]}
      rows={[...rows.values()]
        .sort((a, b) => b.revenue - a.revenue)
        .map((row) => [
          row.name,
          row.phone,
          row.count,
          `$${money(row.revenue)}`,
          formatDate(row.lastVisit),
        ])}
    />
  );
}

async function vehicleHistoryReport(query: string) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return (
      <div className="empty-state">
        <h2>Search vehicle history</h2>
        <p>Type at least 2 characters to search by customer, vehicle, plate, VIN, or invoice.</p>
      </div>
    );
  }

  const contains = {
    contains: normalizedQuery,
    mode: Prisma.QueryMode.insensitive,
  };

  const invoices = await prisma.invoice.findMany({
    where: {
      OR: [
        { invoiceNumber: contains },
        { customer: { OR: [{ firstName: contains }, { lastName: contains }, { phone: contains }] } },
        {
          vehicle: {
            OR: [
              { year: contains },
              { make: contains },
              { model: contains },
              { vin: contains },
              { licensePlate: contains },
            ],
          },
        },
      ],
    },
    include: {
      customer: true,
      vehicle: true,
      order: {
        include: {
          quotedByEmployee: true,
          lineItems: {
            include: {
              inventoryItem: true,
              performedByEmployee: true,
            },
          },
        },
      },
      lineItems: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
  });

  return (
    <ReportTable
      columns={["Date", "Invoice", "Customer", "Vehicle", "Items", "Total"]}
      rows={invoices.map((invoice) => [
        formatDate(invoice.createdAt),
        invoice.invoiceNumber,
        customerName(invoice),
        vehicleLabel(invoice.vehicle),
        invoice.lineItems.map((line) => line.description).join(", "),
        `$${money(decimal(invoice.total))}`,
      ])}
    />
  );
}

function averageRepairOrderReport(invoices: InvoiceWithDetails[]) {
  const total = invoices.reduce((sum, invoice) => sum + decimal(invoice.total), 0);
  const vehicleCount = new Set(
    invoices.map((invoice) => invoice.vehicleId).filter(Boolean),
  ).size;
  const averageInvoice = invoices.length ? total / invoices.length : 0;
  const averagePerVehicle = vehicleCount ? total / vehicleCount : 0;

  return (
    <>
      <MetricGrid
        metrics={[
          { label: "Invoice Count", value: String(invoices.length) },
          { label: "Vehicle Count", value: String(vehicleCount) },
          { label: "Average Invoice", value: `$${money(averageInvoice)}` },
          { label: "Average Per Vehicle", value: `$${money(averagePerVehicle)}` },
        ]}
      />
      <ReportTable
        columns={["Invoice", "Customer", "Vehicle", "Total", "Created"]}
        rows={invoices.map((invoice) => [
          invoice.invoiceNumber,
          customerName(invoice),
          vehicleLabel(invoice.vehicle),
          `$${money(decimal(invoice.total))}`,
          formatDate(invoice.createdAt),
        ])}
      />
    </>
  );
}

export default async function ReportPage({ params, searchParams }: ReportPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { slug } = await params;
  const title = reportTitles[slug];

  if (!title) {
    notFound();
  }

  const search = await searchParams;
  const { start, end } = reportRange(search);
  const usesDateRange = !["low-stock", "vehicle-history"].includes(slug);
  const invoices = usesDateRange ? await getInvoices(start, end) : [];

  let content;

  if (slug === "revenue") content = revenueReport(invoices);
  if (slug === "profit") content = profitReport(invoices);
  if (slug === "inventory-used") content = inventoryUsedReport(invoices);
  if (slug === "low-stock") content = await lowStockReport();
  if (slug === "employee-revenue") content = employeeRevenueReport(invoices);
  if (slug === "service-performed") content = servicePerformedReport(invoices);
  if (slug === "unpaid-invoices") content = unpaidInvoicesReport(invoices);
  if (slug === "customer-activity") content = customerActivityReport(invoices);
  if (slug === "vehicle-history") content = await vehicleHistoryReport(search?.q ?? "");
  if (slug === "average-repair-order") content = averageRepairOrderReport(invoices);

  return (
    <main className="placeholder-shell report-page-shell">
      <Link className="home-link print-hidden" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel report-document">
        <div className="report-screen-actions print-hidden">
          <Link className="back-link" href="/reports">
            Back to Reports
          </Link>
          <PrintButton />
        </div>

        <header className="report-header">
          <div>
            <p className="eyebrow">Healdton Service Center</p>
            <h1>{title}</h1>
            <p className="helper">
              {usesDateRange
                ? `${formatDate(start)} through ${formatDate(end)}`
                : "Current report"}
            </p>
          </div>
        </header>

        {usesDateRange ? (
          <DateFilter end={end} start={start} />
        ) : slug === "vehicle-history" ? (
          <SearchFilter defaultValue={search?.q ?? ""} />
        ) : null}

        <div className="report-content">{content}</div>
      </section>
    </main>
  );
}
