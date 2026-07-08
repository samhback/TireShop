import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { SHOP } from "@/lib/shop";
import { agingBucket, invoiceLabor, invoiceParts } from "@/lib/statement";
import { InvoiceDocument } from "@/app/invoices/[id]/print/InvoiceDocument";
import { PrintButton } from "./PrintButton";

type StatementPrintPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ invoices?: string }>;
};

function amount(value: { toString(): string } | number) {
  return Number(value.toString()).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statementDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(value);
}

function invoiceDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(value);
}

function vehicleUnit(vehicle: {
  year: string;
  make: string;
  model: string;
  trim: string | null;
  vin: string | null;
} | null) {
  if (!vehicle) {
    return "";
  }

  return [
    [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
      .filter(Boolean)
      .join(" "),
    vehicle.vin,
  ]
    .filter(Boolean)
    .join("  ");
}

export default async function StatementPrintPage({
  params,
  searchParams,
}: StatementPrintPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const statementId = Number(id);

  if (!Number.isInteger(statementId)) {
    notFound();
  }

  const query = await searchParams;
  const withInvoices = query?.invoices === "1";

  const statement = await prisma.companyInvoice.findUnique({
    where: { id: statementId },
    include: {
      company: true,
      invoices: {
        include: {
          customer: true,
          vehicle: true,
          order: { include: { quotedByEmployee: true } },
          lineItems: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!statement) {
    notFound();
  }

  const aging = { current: 0, d30: 0, d60: 0, d90: 0 };
  for (const invoice of statement.invoices) {
    const bucket = agingBucket(invoice.createdAt, statement.statementDate);
    aging[bucket] += Number(invoice.total.toString());
  }

  return (
    <main className="quote-print-shell">
      <div className="quote-screen-actions">
        <PrintButton />
      </div>

      <section className="statement-document">
        <header className="statement-header">
          <div className="statement-shop">
            <strong>{SHOP.name}</strong>
            {SHOP.addressLines.map((line) => (
              <span key={line}>{line}</span>
            ))}
            {SHOP.phone || SHOP.fax ? (
              <span>
                {SHOP.phone ? `Phone: ${SHOP.phone}` : ""}
                {SHOP.phone && SHOP.fax ? "  " : ""}
                {SHOP.fax ? `Fax: ${SHOP.fax}` : ""}
              </span>
            ) : null}
          </div>
          <div className="statement-title">
            <h1>Balance Due Statement</h1>
            <p>Statement Date : {statementDate(statement.statementDate)}</p>
            <p>Customer ID : {statement.company.id}</p>
          </div>
        </header>

        <div className="statement-billto">
          <strong>{statement.company.name.toUpperCase()}</strong>
          {statement.company.billingAddress
            ? statement.company.billingAddress
                .split("\n")
                .map((line, index) => <span key={index}>{line}</span>)
            : null}
        </div>

        <table className="statement-table">
          <thead>
            <tr>
              <th>INV Number</th>
              <th>INV Date</th>
              <th>Ref #</th>
              <th className="statement-num">Parts</th>
              <th className="statement-num">Labor</th>
              <th className="statement-num">Tax</th>
              <th className="statement-num">Total</th>
            </tr>
          </thead>
          {statement.invoices.map((invoice) => {
            const parts = invoiceParts(invoice.lineItems);
            const labor = invoiceLabor(invoice.lineItems);

            return (
              <tbody key={invoice.id} className="statement-invoice-group">
                  <tr className="statement-row">
                    <td>{invoice.invoiceNumber}</td>
                    <td>{invoiceDate(invoice.createdAt)}</td>
                    <td />
                    <td className="statement-num">
                      {parts > 0 ? amount(parts) : ""}
                    </td>
                    <td className="statement-num">
                      {labor > 0 ? amount(labor) : ""}
                    </td>
                    <td className="statement-num">{amount(invoice.taxAmount)}</td>
                    <td className="statement-num">{amount(invoice.total)}</td>
                  </tr>
                  <tr className="statement-subrow">
                    <td colSpan={4}>{vehicleUnit(invoice.vehicle)}</td>
                    <td className="statement-balance" colSpan={3}>
                      INV Balance Due : ${amount(invoice.total)}
                    </td>
                  </tr>
                </tbody>
              );
            })}
        </table>

        <div className="statement-summary">
          <div className="statement-aging">
            <div className="statement-aging-row statement-aging-head">
              <span>Current</span>
              <span>+ 30 Days</span>
              <span>+ 60 Days</span>
              <span>+ 90 Days</span>
            </div>
            <div className="statement-aging-row">
              <span>{amount(aging.current)}</span>
              <span>{amount(aging.d30)}</span>
              <span>{amount(aging.d60)}</span>
              <span>{amount(aging.d90)}</span>
            </div>
          </div>

          <div className="statement-totals">
            <div>
              <span>Total Invoice(s) :</span>
              <strong>{amount(statement.total)}</strong>
            </div>
            <div className="statement-balance-due">
              <span>Total Balance Due :</span>
              <strong>$ {amount(statement.total)}</strong>
            </div>
          </div>
        </div>

        <div className="statement-payto">
          <p>
            Make all checks payable to: <strong>{SHOP.name}</strong>
          </p>
          <p>
            If you have any question concerning this invoice, please contact us
            immediately.
          </p>
          <p className="statement-thanks">THANK YOU FOR YOUR BUSINESS!</p>
        </div>
      </section>

      {withInvoices
        ? statement.invoices.map((invoice) => (
            <div className="statement-invoice-page" key={invoice.id}>
              <InvoiceDocument invoice={invoice} />
            </div>
          ))
        : null}
    </main>
  );
}
