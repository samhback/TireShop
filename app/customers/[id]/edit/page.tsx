import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addCustomerVehicle,
  createCustomerAccountEntry,
  deleteCustomer,
  updateCustomer,
} from "@/app/actions";
import { DeleteButton } from "@/app/DeleteButton";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { stateOptions } from "@/lib/vehicleOptions";
import { VehicleFields } from "../../VehicleFields";
import { PhoneInput } from "../../add/PhoneInput";

type EditCustomerPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    updated?: string;
    vehicleAdded?: string;
    accountUpdated?: string;
    error?: string;
  }>;
};

const accountEntryActions = [
  {
    type: "payment_on_account",
    title: "Record Payment On Account",
    description: "Use when a customer pays toward an open account balance.",
  },
  {
    type: "deposit",
    title: "Record Deposit",
    description: "Use when a customer leaves money before final invoice payment.",
  },
  {
    type: "credit",
    title: "Add Credit",
    description: "Use for a customer credit that can be applied later.",
  },
  {
    type: "applied_credit",
    title: "Apply Credit",
    description: "Use when credit is consumed against customer charges.",
  },
  {
    type: "late_fee",
    title: "Add Late Fee",
    description: "Use when an account balance receives a late fee.",
  },
];

function money(value: number) {
  return value.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
}

function accountEntryLabel(entryType: string) {
  const labels: Record<string, string> = {
    payment_on_account: "Payment On Account",
    deposit: "Deposit",
    credit: "Credit",
    applied_credit: "Applied Credit",
    late_fee: "Late Fee",
    charge: "Charge",
  };

  return labels[entryType] ?? entryType;
}

export default async function EditCustomerPage({
  params,
  searchParams,
}: EditCustomerPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const customerId = Number(id);

  if (!Number.isInteger(customerId)) {
    notFound();
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
    include: {
      accountEntries: {
        orderBy: {
          createdAt: "desc",
        },
        take: 25,
      },
      vehicles: {
        include: {
          _count: {
            select: {
              invoices: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const companies = await prisma.company.findMany({
    orderBy: {
      name: "asc",
    },
  });
  const query = await searchParams;
  const accountEntries = customer.accountEntries;
  const entryTotal = (entryTypes: string[]) =>
    accountEntries
      .filter((entry) => entryTypes.includes(entry.entryType))
      .reduce((sum, entry) => sum + Number(entry.amount), 0);
  const accountBalance =
    entryTotal(["charge", "late_fee"]) -
    entryTotal(["payment_on_account", "applied_credit"]);
  const availableCredit =
    entryTotal(["credit", "deposit"]) - entryTotal(["applied_credit"]);
  const depositTotal = entryTotal(["deposit"]);

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/customers/search">
          Back to Search Customers
        </Link>

        <p className="eyebrow">Edit Customer</p>
        <h1>
          {customer.firstName} {customer.lastName}
        </h1>
        <p className="helper">
          Update customer details or add another vehicle to this customer.
        </p>

        {query?.updated === "1" ? (
          <p className="success">Customer updated.</p>
        ) : null}

        {query?.vehicleAdded === "1" ? (
          <p className="success">Vehicle added.</p>
        ) : null}

        {query?.accountUpdated === "1" ? (
          <p className="success">Customer account updated.</p>
        ) : null}

        {query?.error === "customer" ? (
          <p className="error">Check the required customer fields.</p>
        ) : null}

        {query?.error === "vehicle" ? (
          <p className="error">Check the required vehicle fields.</p>
        ) : null}

        {query?.error === "account" ? (
          <p className="error">Check the account entry amount.</p>
        ) : null}

        {query?.error === "history" ? (
          <p className="error">
            This customer has orders, invoices, or payments. Delete their
            invoices first, then delete the customer.
          </p>
        ) : null}

        {query?.error === "delete" ? (
          <p className="error">Unable to delete this customer.</p>
        ) : null}

        <form className="customer-form" action={updateCustomer}>
          <input name="customerId" type="hidden" value={customer.id} />

          <div className="form-section">
            <h2>Customer Info</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="firstName">First Name</label>
                <input
                  defaultValue={customer.firstName}
                  id="firstName"
                  name="firstName"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="lastName">Last Name</label>
                <input
                  defaultValue={customer.lastName}
                  id="lastName"
                  name="lastName"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="phone">Phone</label>
                <PhoneInput defaultValue={customer.phone} />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  defaultValue={customer.email ?? ""}
                  id="email"
                  name="email"
                  type="email"
                />
              </div>

              <div className="field">
                <label htmlFor="preferredContactMethod">Preferred Contact</label>
                <select
                  defaultValue={customer.preferredContactMethod ?? ""}
                  id="preferredContactMethod"
                  name="preferredContactMethod"
                >
                  <option value="">Select one</option>
                  <option value="phone">Phone</option>
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="companyId">Company</label>
                <select
                  defaultValue={customer.companyId?.toString() ?? ""}
                  id="companyId"
                  name="companyId"
                >
                  <option value="">No company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Address</h2>
            <div className="form-grid">
              <div className="field form-grid-wide">
                <label htmlFor="address">Address</label>
                <input
                  defaultValue={customer.address ?? ""}
                  id="address"
                  name="address"
                />
              </div>

              <div className="field">
                <label htmlFor="city">City</label>
                <input defaultValue={customer.city ?? ""} id="city" name="city" />
              </div>

              <div className="field">
                <label htmlFor="state">State</label>
                <select
                  defaultValue={customer.state ?? "OK"}
                  id="state"
                  name="state"
                >
                  {stateOptions.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="zip">ZIP</label>
                <input defaultValue={customer.zip ?? ""} id="zip" name="zip" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Notes</h2>
            <div className="field">
              <label htmlFor="customerNotes">Customer Notes</label>
              <textarea
                defaultValue={customer.notes ?? ""}
                id="customerNotes"
                name="customerNotes"
              />
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Save Customer</span>
            <span className="button-mark" aria-hidden="true">
              ✓
            </span>
          </button>
        </form>

        <div className="form-section">
          <div className="section-heading-row">
            <div>
              <h2>Customer Account</h2>
              <p className="helper">
                Track account payments, deposits, credits, applied credits, and
                late fees for accounting reports.
              </p>
            </div>
          </div>

          <div className="account-metric-grid">
            <div className="account-metric-card">
              <span>Account Balance</span>
              <strong>${money(accountBalance)}</strong>
            </div>
            <div className="account-metric-card">
              <span>Available Credit</span>
              <strong>${money(availableCredit)}</strong>
            </div>
            <div className="account-metric-card">
              <span>Deposits</span>
              <strong>${money(depositTotal)}</strong>
            </div>
          </div>

          <div className="account-action-grid">
            {accountEntryActions.map((action) => (
              <form
                action={createCustomerAccountEntry}
                className="account-action-card"
                key={action.type}
              >
                <input name="customerId" type="hidden" value={customer.id} />
                <input name="entryType" type="hidden" value={action.type} />
                <div>
                  <h3>{action.title}</h3>
                  <p>{action.description}</p>
                </div>
                <div className="field">
                  <label htmlFor={`${action.type}-amount`}>Amount</label>
                  <input
                    id={`${action.type}-amount`}
                    min="0.01"
                    name="amount"
                    placeholder="0.00"
                    required
                    step="0.01"
                    type="number"
                  />
                </div>
                <div className="field">
                  <label htmlFor={`${action.type}-description`}>Note</label>
                  <input
                    id={`${action.type}-description`}
                    name="description"
                    placeholder="Optional"
                  />
                </div>
                <button className="secondary-button" type="submit">
                  Save
                </button>
              </form>
            ))}
          </div>

          <div className="account-entry-list">
            <h3>Recent Account Activity</h3>
            {accountEntries.length > 0 ? (
              accountEntries.map((entry) => (
                <div className="account-entry-row" key={entry.id}>
                  <div>
                    <strong>{accountEntryLabel(entry.entryType)}</strong>
                    {entry.description ? <p>{entry.description}</p> : null}
                  </div>
                  <span>${money(Number(entry.amount))}</span>
                  <small>{entry.createdAt.toLocaleDateString("en-US")}</small>
                </div>
              ))
            ) : (
              <p className="helper">No account activity yet.</p>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Vehicles</h2>
          <div className="vehicle-card-list">
            {customer.vehicles.map((vehicle) => (
              <article className="customer-result-card" key={vehicle.id}>
                <div className="customer-result-header">
                  <h3>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h3>
                  {vehicle._count.invoices > 0 ? (
                    <Link
                      className="secondary-link-button"
                      href={`/vehicles/${vehicle.id}/history`}
                    >
                      Vehicle History
                    </Link>
                  ) : null}
                </div>
                <p>
                  {[
                    vehicle.licensePlate ? `Plate ${vehicle.licensePlate}` : null,
                    vehicle.vin ? `VIN ${vehicle.vin}` : null,
                    vehicle.mileage ? `${vehicle.mileage} miles` : null,
                    vehicle.engineSize ? `Engine ${vehicle.engineSize}` : null,
                    vehicle.transmissionType
                      ? `${vehicle.transmissionType} transmission`
                      : null,
                    vehicle.fuelType ? vehicle.fuelType : null,
                    vehicle.driveType ? vehicle.driveType : null,
                    vehicle.tireSize ? `Tires ${vehicle.tireSize}` : null,
                  ]
                    .filter(Boolean)
                    .join(" | ")}
                </p>
              </article>
            ))}
          </div>
        </div>

        <form className="customer-form" action={addCustomerVehicle}>
          <input name="customerId" type="hidden" value={customer.id} />

          <div className="form-section">
            <h2>Add Vehicle</h2>
            <div className="form-grid">
              <VehicleFields idPrefix="newVehicle" />

              <div className="field form-grid-wide">
                <label htmlFor="vehicleNotes">Vehicle Notes</label>
                <textarea id="vehicleNotes" name="vehicleNotes" />
              </div>
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Add Vehicle</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>

        <div className="form-section">
          <div className="section-heading-row">
            <div>
              <h2>Delete Customer</h2>
              <p className="helper">
                Permanently removes this customer along with their vehicles and
                account activity. Customers with orders, invoices, or payments
                must have those invoices deleted first. This cannot be undone.
              </p>
            </div>
            <DeleteButton
              action={deleteCustomer}
              fieldName="customerId"
              fieldValue={customer.id}
              label="Delete Customer"
              confirmMessage={`Delete ${customer.firstName} ${customer.lastName}? This removes the customer, their vehicles, and account activity, and cannot be undone.`}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
