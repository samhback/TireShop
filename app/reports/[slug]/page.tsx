import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { salesCategoryLabel } from "@/lib/salesCategories";
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
    payments: true;
  };
}>;

const reportTitles: Record<string, string> = {
  "sales-receipts-summary": "Sales Receipts Summary",
  "inventory-part-sales": "Inventory Part Sales",
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

function formatNumericDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(value);
}

function accountingAmount(value: number, includeDollar = false) {
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));

  return `${value < 0 ? "-" : ""}${includeDollar ? "$" : ""}${formatted}`;
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
      payments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

async function getAccountEntries(start: Date, end: Date) {
  return prisma.customerAccountEntry.findMany({
    where: {
      entryDate: {
        gte: start,
        lte: end,
      },
    },
    orderBy: {
      entryDate: "desc",
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

function salesCategory(line: InvoiceWithDetails["lineItems"][number]) {
  return salesCategoryLabel(line.salesCategory);
}

function salesReceiptsSummaryReport(
  invoices: InvoiceWithDetails[],
  accountEntries: Awaited<ReturnType<typeof getAccountEntries>>,
  start: Date,
  end: Date,
) {
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const payments = paidInvoices.flatMap((invoice) => invoice.payments);
  const ledgerOnlyTotal = (entryType: string) =>
    accountEntries
      .filter((entry) => entry.entryType === entryType && !entry.paymentId)
      .reduce((sum, entry) => sum + decimal(entry.amount), 0);
  const receiptsPaidOnAccount = payments
    .filter((payment) => payment.purpose === "account")
    .reduce((sum, payment) => sum + decimal(payment.amount), 0) +
    ledgerOnlyTotal("payment_on_account");
  const receiptsOnDeposit = payments
    .filter((payment) => payment.purpose === "deposit")
    .reduce((sum, payment) => sum + decimal(payment.amount), 0) +
    ledgerOnlyTotal("deposit");
  const receiptsPaidOnInvoices = payments
    .filter((payment) => payment.purpose === "invoice")
    .reduce((sum, payment) => sum + decimal(payment.amount), 0);
  const totalReceipts =
    receiptsPaidOnInvoices + receiptsPaidOnAccount + receiptsOnDeposit;
  const postedRows = [
    "Parts",
    "Parts Discount",
    "Cores",
    "Labor",
    "Labor Discount",
    "Tires",
    "Sublet",
    "Shop Supplies",
    "Hazardous Materials",
    "Tire Disposal",
  ].map((label) => ({ label, taxable: 0, nonTaxable: 0, isDiscount: label.includes("Discount") }));

  invoices.flatMap((invoice) => invoice.lineItems).forEach((line) => {
    const category = salesCategory(line);
    const quantity = decimal(line.quantity);
    const gross = quantity * decimal(line.unitPrice);
    const net = decimal(line.lineTotal);
    const discount = Math.max(gross - net, 0);
    const salesRow = postedRows.find((row) => row.label === category);
    const discountRow = postedRows.find((row) =>
      category === "Labor" ? row.label === "Labor Discount" : row.label === "Parts Discount",
    );
    const column = line.taxable ? "taxable" : "nonTaxable";

    if (salesRow) {
      salesRow[column] += gross;
    }

    if (discount > 0 && discountRow) {
      discountRow[column] -= discount;
    }
  });

  const taxableSubtotal = postedRows.reduce((sum, row) => sum + row.taxable, 0);
  const nonTaxableSubtotal = postedRows.reduce(
    (sum, row) => sum + row.nonTaxable,
    0,
  );
  const postedSubtotal = taxableSubtotal + nonTaxableSubtotal;
  const taxCollected = invoices.reduce(
    (sum, invoice) => sum + decimal(invoice.taxAmount),
    0,
  );
  const totalSalesWithTax = postedSubtotal + taxCollected;
  const balanceDueCharges = invoices
    .filter((invoice) => invoice.status !== "paid")
    .reduce((sum, invoice) => sum + decimal(invoice.total), 0);
  const lateFeesAssessed = accountEntries
    .filter((entry) => entry.entryType === "late_fee")
    .reduce((sum, entry) => sum + decimal(entry.amount), 0);
  const appliedCredits = accountEntries
    .filter((entry) => entry.entryType === "applied_credit")
    .reduce((sum, entry) => sum + decimal(entry.amount), 0);

  return (
    <div className="sales-receipts-report">
      <header className="sales-receipts-header">
        <div>
          <h1>Sales / Receipts Summary for Healdton Service Center</h1>
          <p>
            <strong>From:</strong> {formatNumericDate(start)}{" "}
            <strong>To:</strong> {formatNumericDate(end)}
          </p>
        </div>
        <p>
          <strong>Printed:</strong> {formatNumericDate(new Date())}
        </p>
      </header>

      <section className="accounting-section receipts-summary-block">
        <h2>Receipts Summary</h2>
        <div className="receipt-lines">
          <div>
            <span>Total Receipts Paid On Invoices :</span>
            <strong>{accountingAmount(receiptsPaidOnInvoices)}</strong>
          </div>
          <div>
            <span>Total Receipts Paid On Account :</span>
            <strong>{accountingAmount(receiptsPaidOnAccount)}</strong>
          </div>
          <div>
            <span>Total Receipts On Deposit :</span>
            <strong>{accountingAmount(receiptsOnDeposit)}</strong>
          </div>
          <div className="receipt-total">
            <span />
            <strong>{accountingAmount(totalReceipts, true)}</strong>
          </div>
        </div>
      </section>

      <section className="accounting-section posted-order-sales">
        <div className="posted-sales-header">
          <strong>Posted Order Sales</strong>
          <strong>Taxable</strong>
          <strong>Non-taxable</strong>
          <strong>Total</strong>
        </div>

        <div className="posted-sales-body">
          {postedRows.map((row) => (
            <div className="posted-sales-row" key={row.label}>
              <span>{row.label} :</span>
              <span className={row.isDiscount ? "discount-value" : ""}>
                {accountingAmount(row.taxable)}
              </span>
              <span className={row.isDiscount ? "discount-value" : ""}>
                {accountingAmount(row.nonTaxable)}
              </span>
              <span className={row.isDiscount ? "discount-value" : ""}>
                {accountingAmount(row.taxable + row.nonTaxable)}
              </span>
            </div>
          ))}

          <div className="posted-sales-row posted-subtotal">
            <span>Subtotal:</span>
            <strong>{accountingAmount(taxableSubtotal, true)}</strong>
            <strong>{accountingAmount(nonTaxableSubtotal, true)}</strong>
            <strong>{accountingAmount(postedSubtotal)}</strong>
          </div>

          <div className="posted-sales-row tax-line">
            <span />
            <span />
            <span>+ Tax :</span>
            <strong>{accountingAmount(taxCollected)}</strong>
          </div>

          <div className="posted-sales-row total-sales-tax">
            <span />
            <span />
            <span>Total Sales with Tax:</span>
            <strong>{accountingAmount(totalSalesWithTax, true)}</strong>
          </div>

          <div className="posted-sales-row balance-summary">
            <span />
            <span />
            <span>*Balance Due Charges Summary:</span>
            <strong>{accountingAmount(balanceDueCharges, true)}</strong>
          </div>

          <div className="posted-sales-row balance-detail">
            <span />
            <span />
            <span>Late Fees Assessed:</span>
            <strong>{accountingAmount(lateFeesAssessed)}</strong>
          </div>

          <div className="posted-sales-row balance-detail">
            <span />
            <span />
            <span>From Applied Credits:</span>
            <strong>{accountingAmount(appliedCredits, true)}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}

async function inventoryPartSalesReport(
  invoices: InvoiceWithDetails[],
  start: Date,
  end: Date,
) {
  const inventoryLines = invoices
    .flatMap((invoice) => invoice.lineItems)
    .filter((line) => line.lineType === "inventory");
  const inventoryIds = [
    ...new Set(
      inventoryLines
        .map((line) => line.inventoryItemId)
        .filter((id): id is number => typeof id === "number"),
    ),
  ];
  const inventoryItems = await prisma.inventoryItem.findMany({
    select: {
      id: true,
      name: true,
      partNumber: true,
      cost: true,
    },
  });
  const inventoryById = new Map(inventoryItems.map((item) => [item.id, item]));
  const inventoryByName = new Map(
    inventoryItems.map((item) => [item.name.trim().toLowerCase(), item]),
  );
  const rows = new Map<
    string,
    {
      partNumber: string;
      description: string;
      quantity: number;
      cost: number;
      extendedCost: number;
    }
  >();

  inventoryLines.forEach((line) => {
    const item =
      (line.inventoryItemId ? inventoryById.get(line.inventoryItemId) : null) ??
      inventoryByName.get(line.description.trim().toLowerCase()) ??
      null;
    const partNumber =
      item?.partNumber?.trim() || line.inventoryItemId?.toString() || "";
    const description = line.description || item?.name || "Inventory Item";
    const quantity = decimal(line.quantity);
    const historicalCost = decimal(line.costAtSale);
    const cost = historicalCost > 0 ? historicalCost : decimal(item?.cost);
    const key = `${partNumber}::${description}::${cost.toFixed(2)}`;
    const existingRow = rows.get(key);

    if (existingRow) {
      existingRow.quantity += quantity;
      existingRow.extendedCost += quantity * cost;
    } else {
      rows.set(key, {
        partNumber,
        description,
        quantity,
        cost,
        extendedCost: quantity * cost,
      });
    }
  });

  const sortedRows = [...rows.values()].sort((first, second) =>
    first.partNumber.localeCompare(second.partNumber, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
  const grandTotal = sortedRows.reduce(
    (sum, row) => sum + row.extendedCost,
    0,
  );

  return (
    <div className="inventory-part-sales-report">
      <header className="inventory-part-sales-header">
        <h1>Inventory Part Sales</h1>
        <div className="inventory-part-sales-dates">
          <span>
            Print Date : <strong>{formatNumericDate(new Date())}</strong>
          </span>
          <span>
            Period From : <strong>{formatNumericDate(start)}</strong>
          </span>
          <span>
            To : <strong>{formatNumericDate(end)}</strong>
          </span>
        </div>
      </header>

      <table className="inventory-part-sales-table">
        <thead>
          <tr>
            <th>Part Number</th>
            <th>Description</th>
            <th>Quantity</th>
            <th>Cost</th>
            <th>Extended Cost</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.length > 0 ? (
            sortedRows.map((row) => (
              <tr key={`${row.partNumber}-${row.description}-${row.cost}`}>
                <td>{row.partNumber}</td>
                <td>{row.description}</td>
                <td>{accountingAmount(row.quantity)}</td>
                <td>{accountingAmount(row.cost)}</td>
                <td>{accountingAmount(row.extendedCost)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5}>No inventory part sales for this period.</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} />
            <td>Grand Total:</td>
            <td>{accountingAmount(grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function profitReport(invoices: InvoiceWithDetails[]) {
  const inventoryLines = invoices.flatMap((invoice) => invoice.lineItems).filter(
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
    (sum, line) => sum + decimal(line.quantity) * decimal(line.costAtSale),
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
        Inventory profit uses the cost stored on each invoice line at the time the invoice was created.
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
          const cost = decimal(line.quantity) * decimal(line.costAtSale);

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

  invoices.flatMap((invoice) => invoice.lineItems).forEach((line) => {
    if (line.lineType !== "inventory") {
      return;
    }

    const key = `${line.inventoryItemId ?? line.description}`;
    const existing = rows.get(key) ?? {
      category: line.category ?? "Unknown",
      name: line.description,
      quantity: 0,
      revenue: 0,
      cost: 0,
    };
    const quantity = decimal(line.quantity);

    existing.quantity += quantity;
    existing.revenue += decimal(line.lineTotal);
    existing.cost += quantity * decimal(line.costAtSale);
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
  const accountEntries =
    slug === "sales-receipts-summary" ? await getAccountEntries(start, end) : [];

  let content;

  if (slug === "revenue") content = revenueReport(invoices);
  if (slug === "sales-receipts-summary") {
    content = salesReceiptsSummaryReport(invoices, accountEntries, start, end);
  }
  if (slug === "inventory-part-sales") {
    content = await inventoryPartSalesReport(invoices, start, end);
  }
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

        {!["sales-receipts-summary", "inventory-part-sales"].includes(slug) ? (
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
        ) : null}

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
