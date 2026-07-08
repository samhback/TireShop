import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  deleteCompanyStatement,
  markCompanyStatementPaid,
} from "@/app/actions";
import { DeleteButton } from "@/app/DeleteButton";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { invoiceLabor, invoiceParts } from "@/lib/statement";

type StatementPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    created?: string;
    paid?: string;
    error?: string;
  }>;
};

function money(value: { toString(): string } | number) {
  return Number(value.toString()).toFixed(2);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value);
}

function vehicleLabel(vehicle: {
  year: string;
  make: string;
  model: string;
  color: string | null;
} | null) {
  if (!vehicle) {
    return "No vehicle";
  }

  return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
}

export default async function CompanyStatementPage({
  params,
  searchParams,
}: StatementPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const statementId = Number(id);

  if (!Number.isInteger(statementId)) {
    notFound();
  }

  const statement = await prisma.companyInvoice.findUnique({
    where: { id: statementId },
    include: {
      company: true,
      invoices: {
        include: {
          customer: true,
          vehicle: true,
          lineItems: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!statement) {
    notFound();
  }

  const query = await searchParams;
  const isPaid = statement.status === "paid";

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/company-invoices">
          Back to Company Invoices
        </Link>

        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Balance Due Statement</p>
            <h1>{statement.company.name}</h1>
            <p className="helper">
              Statement date {formatDate(statement.statementDate)} |{" "}
              {statement.invoices.length} invoice
              {statement.invoices.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="company-history-actions">
            <Link
              className="secondary-link-button"
              href={`/company-invoices/${statement.id}/print`}
              target="_blank"
            >
              Print Statement
            </Link>
            <Link
              className="secondary-link-button"
              href={`/company-invoices/${statement.id}/print?invoices=1`}
              target="_blank"
            >
              Print Statement + All Invoices
            </Link>
          </div>
        </div>

        {query?.created === "1" ? (
          <p className="success">Statement generated.</p>
        ) : null}
        {query?.paid === "1" ? (
          <p className="success">
            Statement and all its invoices marked as paid.
          </p>
        ) : null}
        {query?.error === "payment" ? (
          <p className="error">Unable to record payment. Choose a method.</p>
        ) : null}
        {query?.error === "paidDelete" ? (
          <p className="error">
            A paid statement cannot be deleted; its payments are already
            recorded.
          </p>
        ) : null}
        {query?.error === "delete" ? (
          <p className="error">Unable to delete this statement.</p>
        ) : null}

        <div className="order-summary-grid">
          <article className="order-summary-card">
            <span>Bill To</span>
            <h2>{statement.company.name}</h2>
            {statement.company.billingAddress ? (
              <p style={{ whiteSpace: "pre-line" }}>
                {statement.company.billingAddress}
              </p>
            ) : null}
            {statement.company.email ? <p>{statement.company.email}</p> : null}
          </article>

          <article className="order-summary-card">
            <span>Status</span>
            <h2>{isPaid ? "Paid" : "Unpaid"}</h2>
            {statement.paidAt ? (
              <p>
                Paid {formatDate(statement.paidAt)}
                {statement.paidByUsername ? ` by ${statement.paidByUsername}` : ""}
                {statement.paymentMethod ? ` via ${statement.paymentMethod}` : ""}
              </p>
            ) : null}
          </article>

          <article className="order-summary-card">
            <span>Total Balance Due</span>
            <h2>${money(statement.total)}</h2>
            <p>Tax included: ${money(statement.taxAmount)}</p>
          </article>
        </div>

        {!isPaid ? (
          <div className="form-section">
            <h2>Record Payment</h2>
            <p className="helper">
              Marking this statement paid marks all {statement.invoices.length}{" "}
              invoice{statement.invoices.length === 1 ? "" : "s"} paid and
              records a payment for each.
            </p>
            <form action={markCompanyStatementPaid}>
              <input name="statementId" type="hidden" value={statement.id} />
              <label className="compact-payment-field">
                Payment Method
                <select name="paymentMethod" required>
                  <option value="">Choose method</option>
                  <option value="check">Check</option>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="account">Account</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <button className="secondary-button" type="submit">
                Mark Statement Paid
              </button>
            </form>
          </div>
        ) : null}

        <div className="form-section service-preview">
          <h2>Invoices On This Statement</h2>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Parts</th>
                  <th>Labor</th>
                  <th>Tax</th>
                  <th>Balance Due</th>
                </tr>
              </thead>
              <tbody>
                {statement.invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link href={`/invoices/${invoice.id}`}>
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td>{formatDate(invoice.createdAt)}</td>
                    <td>{vehicleLabel(invoice.vehicle)}</td>
                    <td>${money(invoiceParts(invoice.lineItems))}</td>
                    <td>${money(invoiceLabor(invoice.lineItems))}</td>
                    <td>${money(invoice.taxAmount)}</td>
                    <td>${money(invoice.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6}>Total Balance Due</td>
                  <td>${money(statement.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {!isPaid ? (
          <div className="form-section">
            <div className="section-heading-row">
              <div>
                <h2>Delete Statement</h2>
                <p className="helper">
                  Removes this statement and releases its invoices to be billed
                  again. The invoices themselves are not deleted.
                </p>
              </div>
              <DeleteButton
                action={deleteCompanyStatement}
                fieldName="statementId"
                fieldValue={statement.id}
                label="Delete Statement"
                confirmMessage={`Delete this statement for ${statement.company.name}? Its ${statement.invoices.length} invoice(s) will be released to bill again.`}
              />
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
