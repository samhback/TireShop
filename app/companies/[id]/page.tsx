import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { CompanyEmployeeSearch } from "./CompanyEmployeeSearch";

type CompanyPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    created?: string;
    employeeAdded?: string;
    error?: string;
    updated?: string;
  }>;
};

function moneyPercent(value: { toString(): string }) {
  return Number(value.toString()).toFixed(2);
}

export default async function CompanyPage({
  params,
  searchParams,
}: CompanyPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const companyId = Number(id);

  if (!Number.isInteger(companyId)) {
    notFound();
  }

  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
    include: {
      customers: {
        include: {
          vehicles: {
            orderBy: {
              createdAt: "desc",
            },
            take: 2,
          },
        },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      },
    },
  });

  if (!company) {
    notFound();
  }

  const paramsValue = await searchParams;

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/companies">
          Back to Companies
        </Link>

        <div className="section-heading-row">
          <div>
            <p className="eyebrow">Company</p>
            <h1>{company.name}</h1>
            <p className="helper">
              Inventory markup: {moneyPercent(company.markupPercent)}%
            </p>
          </div>
          <Link className="secondary-link-button" href={`/companies/${company.id}/edit`}>
            Edit Company
          </Link>
        </div>

        {paramsValue?.created === "1" ? (
          <p className="success">Company created.</p>
        ) : null}
        {paramsValue?.updated === "1" ? (
          <p className="success">Company updated.</p>
        ) : null}
        {paramsValue?.employeeAdded === "1" ? (
          <p className="success">Company employee added.</p>
        ) : null}
        {paramsValue?.error === "employee" ? (
          <p className="error">Unable to add that customer to this company.</p>
        ) : null}

        {company.notes ? (
          <div className="form-section">
            <h2>Notes</h2>
            <p>{company.notes}</p>
          </div>
        ) : null}

        <div className="form-section service-preview">
          <h2>Company Employees</h2>
          {company.customers.length > 0 ? (
            <div className="search-results">
              {company.customers.map((customer) => (
                <article className="customer-result-card" key={customer.id}>
                  <div className="customer-result-header">
                    <div>
                      <h3>
                        {customer.firstName} {customer.lastName}
                      </h3>
                      <p>
                        {[customer.phone, customer.email]
                          .filter(Boolean)
                          .join(" | ")}
                      </p>
                    </div>
                    <Link
                      className="secondary-link-button"
                      href={`/customers/${customer.id}/edit`}
                    >
                      Edit
                    </Link>
                  </div>
                  {customer.vehicles.length > 0 ? (
                    <div className="vehicle-list">
                      {customer.vehicles.map((vehicle) => (
                        <span key={vehicle.id}>
                          {[
                            vehicle.color,
                            vehicle.year,
                            vehicle.make,
                            vehicle.model,
                            vehicle.licensePlate
                              ? `Plate ${vehicle.licensePlate}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No employees tagged</h2>
              <p>Add existing customers or create a new customer for this company.</p>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2>Add Employee</h2>
          <CompanyEmployeeSearch companyId={company.id} />
        </div>
      </section>
    </main>
  );
}
