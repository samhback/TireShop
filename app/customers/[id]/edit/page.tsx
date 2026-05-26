import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addCustomerVehicle, updateCustomer } from "@/app/actions";
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
    error?: string;
  }>;
};

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

  const query = await searchParams;

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

        {query?.error === "customer" ? (
          <p className="error">Check the required customer fields.</p>
        ) : null}

        {query?.error === "vehicle" ? (
          <p className="error">Check the required vehicle fields.</p>
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
      </section>
    </main>
  );
}
