import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";

type CompaniesPageProps = {
  searchParams?: Promise<{
    updated?: string;
  }>;
};

function moneyPercent(value: { toString(): string }) {
  return Number(value.toString()).toFixed(2);
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;
  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: {
          customers: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <p className="eyebrow">Companies</p>
        <h1>Companies</h1>
        <p className="helper">
          Manage company markup pricing and customer-employees.
        </p>

        {params?.updated === "1" ? (
          <p className="success">Company updated.</p>
        ) : null}

        <div className="section-grid section-grid-single">
          <Link className="section-card" href="/companies/add">
            <span className="dashboard-icon" aria-hidden="true">
              <Building2 size={26} strokeWidth={2.2} />
            </span>
            <span className="dashboard-card-text">
              <strong>Add Company</strong>
              <span>Add company markup pricing and notes.</span>
            </span>
          </Link>
        </div>

        <div className="form-section service-preview">
          <h2>Current Companies</h2>
          {companies.length > 0 ? (
            <div className="search-results">
              {companies.map((company) => (
                <article className="search-result-card" key={company.id}>
                  <div>
                    <span className="role-label">
                      {company._count.customers} employee
                      {company._count.customers === 1 ? "" : "s"}
                    </span>
                    <h2>{company.name}</h2>
                    <p>Inventory markup: {moneyPercent(company.markupPercent)}%</p>
                    {company.notes ? <p>{company.notes}</p> : null}
                    <Link
                      className="secondary-link-button inline-action-link"
                      href={`/companies/${company.id}`}
                    >
                      Open Company
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No companies yet</h2>
              <p>Add a company to set markup pricing and tag employees.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
