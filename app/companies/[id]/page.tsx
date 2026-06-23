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
} | null) {
  if (!vehicle) {
    return "No vehicle attached";
  }

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

  const companyInvoices = await prisma.invoice.findMany({
    where: {
      order: {
        companyId: company.id,
        isCompanyCar: true,
      },
    },
    include: {
      customer: true,
      vehicle: true,
      order: true,
      lineItems: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

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
              Inventory markup:{" "}
              {company.useCompanyMarkup
                ? `${moneyPercent(company.markupPercent)}%`
                : "Default pricing"}
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

        <div className="form-section service-preview">
          <h2>Company Vehicle History</h2>
          {companyInvoices.length > 0 ? (
            <div className="company-history-list">
              {companyInvoices.map((invoice) => {
                const serviceLines = invoice.lineItems.filter(
                  (item) => item.lineType === "service",
                );
                const inventoryLines = invoice.lineItems.filter(
                  (item) => item.lineType === "inventory",
                );

                return (
                  <article className="company-history-card" key={invoice.id}>
                    <div className="section-heading-row">
                      <div>
                        <p className="eyebrow">{formatDate(invoice.createdAt)}</p>
                        <h3>{vehicleLabel(invoice.vehicle)}</h3>
                        <p>
                          Employee: {invoice.customer.firstName}{" "}
                          {invoice.customer.lastName}
                        </p>
                        <p>
                          Order {invoice.order.orderNumber} | {invoice.invoiceNumber}
                        </p>
                      </div>
                      <div className="company-history-actions">
                        <strong>${money(invoice.total)}</strong>
                        <Link
                          className="secondary-link-button"
                          href={`/invoices/${invoice.id}`}
                        >
                          Open Invoice
                        </Link>
                      </div>
                    </div>

                    <div className="company-history-line-grid">
                      <div>
                        <span className="role-label">Services</span>
                        {serviceLines.length > 0 ? (
                          <ul className="company-history-lines">
                            {serviceLines.map((item) => (
                              <li key={item.id}>
                                {item.description}
                                {item.performedByName
                                  ? ` | Performed by ${item.performedByName}`
                                  : ""}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="company-history-empty">No services.</p>
                        )}
                      </div>

                      <div>
                        <span className="role-label">Inventory</span>
                        {inventoryLines.length > 0 ? (
                          <ul className="company-history-lines">
                            {inventoryLines.map((item) => (
                              <li key={item.id}>
                                {money(item.quantity)} x {item.description}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="company-history-empty">No inventory.</p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No company vehicle history yet</h2>
              <p>Completed company-car invoices for this company will show here.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
