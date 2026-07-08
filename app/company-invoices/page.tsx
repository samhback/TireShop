import Link from "next/link";
import { redirect } from "next/navigation";
import { FileStack } from "lucide-react";
import { createCompanyStatement } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";

type CompanyInvoicesPageProps = {
  searchParams?: Promise<{
    companyId?: string;
    error?: string;
    deleted?: string;
  }>;
};

function money(value: { toString(): string } | number) {
  return Number(value.toString()).toFixed(2);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value);
}

export default async function CompanyInvoicesPage({
  searchParams,
}: CompanyInvoicesPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const query = await searchParams;
  const selectedCompanyId = query?.companyId ?? "";

  const [companies, statements] = await Promise.all([
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.companyInvoice.findMany({
      include: {
        company: { select: { name: true } },
        _count: { select: { invoices: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <p className="eyebrow">Company Invoices</p>
        <h1>Company Invoices</h1>
        <p className="helper">
          Bill a company for all of its unpaid company-car invoices at once, or
          just those within a date range. Marking a statement paid marks every
          invoice on it paid.
        </p>

        {query?.deleted === "1" ? (
          <p className="success">Statement deleted.</p>
        ) : null}
        {query?.error === "none" ? (
          <p className="error">
            That company has no unpaid company-car invoices for that selection.
          </p>
        ) : null}
        {query?.error === "range" ? (
          <p className="error">Enter a valid start and end date.</p>
        ) : null}
        {query?.error === "invalid" ? (
          <p className="error">Choose a company to bill.</p>
        ) : null}

        <div className="form-section">
          <h2>Generate Statement</h2>
          <form className="customer-form" action={createCompanyStatement}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="companyId">Company</label>
                <select
                  defaultValue={selectedCompanyId}
                  id="companyId"
                  name="companyId"
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="mode">Invoices To Bill</label>
                <select defaultValue="all" id="mode" name="mode">
                  <option value="all">All unpaid invoices</option>
                  <option value="range">Unpaid invoices in date range</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="start">Start Date (range only)</label>
                <input id="start" name="start" type="date" />
              </div>

              <div className="field">
                <label htmlFor="end">End Date (range only)</label>
                <input id="end" name="end" type="date" />
              </div>
            </div>

            <button className="submit-button inventory-submit" type="submit">
              <span>Generate Statement</span>
              <span className="button-mark" aria-hidden="true">
                +
              </span>
            </button>
          </form>
        </div>

        <div className="form-section service-preview">
          <h2>Recent Statements</h2>
          {statements.length > 0 ? (
            <div className="search-results">
              {statements.map((statement) => (
                <article className="search-result-card" key={statement.id}>
                  <div>
                    <span className="role-label">{statement.status}</span>
                    <h2>{statement.company.name}</h2>
                    <p>
                      {statement._count.invoices} invoice
                      {statement._count.invoices === 1 ? "" : "s"} |{" "}
                      {statement.rangeStart && statement.rangeEnd
                        ? `${formatDate(statement.rangeStart)} - ${formatDate(
                            statement.rangeEnd,
                          )}`
                        : "All unpaid"}
                    </p>
                    <Link
                      className="secondary-link-button inline-action-link"
                      href={`/company-invoices/${statement.id}`}
                    >
                      Open Statement
                    </Link>
                  </div>

                  <div className="inventory-metrics">
                    <span>
                      Balance Due
                      <strong>${money(statement.total)}</strong>
                    </span>
                    <span>
                      Statement Date
                      <strong>{formatDate(statement.statementDate)}</strong>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FileStack size={28} strokeWidth={2.2} />
              <h2>No statements yet</h2>
              <p>Generate a statement to bill a company for its invoices.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
