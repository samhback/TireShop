import Link from "next/link";
import { redirect } from "next/navigation";
import { createCustomer } from "@/app/actions";
import { UnsavedHomeLink } from "@/app/UnsavedHomeLink";
import { getEmployeeSession } from "@/lib/session";
import { stateOptions } from "@/lib/vehicleOptions";
import { VehicleFields } from "../VehicleFields";
import { PhoneInput } from "./PhoneInput";

type AddCustomerPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

export default async function AddCustomerPage({
  searchParams,
}: AddCustomerPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="placeholder-shell">
      <UnsavedHomeLink />

      <section className="wide-panel">
        <Link className="back-link" href="/customers">
          Back to Customers
        </Link>

        <p className="eyebrow">Add Customer</p>
        <h1>Customer & Vehicle</h1>
        <p className="helper">
          Store customer records, vehicle info, tire size, and maintenance notes.
        </p>

        {params?.created === "1" ? (
          <p className="success">Customer added.</p>
        ) : null}

        {params?.error === "invalid" ? (
          <p className="error">Check the required customer and vehicle fields.</p>
        ) : null}

        <form className="customer-form" action={createCustomer} data-unsaved-guard>
          <div className="form-section">
            <h2>Customer Info</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="firstName">First Name</label>
                <input id="firstName" name="firstName" required />
              </div>

              <div className="field">
                <label htmlFor="lastName">Last Name</label>
                <input id="lastName" name="lastName" required />
              </div>

              <div className="field">
                <label htmlFor="phone">Phone</label>
                <PhoneInput />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" />
              </div>

              <div className="field">
                <label htmlFor="preferredContactMethod">Preferred Contact</label>
                <select id="preferredContactMethod" name="preferredContactMethod">
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
                <input id="address" name="address" />
              </div>

              <div className="field">
                <label htmlFor="city">City</label>
                <input id="city" name="city" />
              </div>

              <div className="field">
                <label htmlFor="state">State</label>
                <select defaultValue="OK" id="state" name="state">
                  {stateOptions.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="zip">ZIP</label>
                <input id="zip" name="zip" />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Vehicle Info</h2>
            <div className="form-grid">
              <VehicleFields />
            </div>
          </div>

          <div className="form-section">
            <h2>Notes</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="customerNotes">Customer Notes</label>
                <textarea id="customerNotes" name="customerNotes" />
              </div>

              <div className="field">
                <label htmlFor="vehicleNotes">Vehicle Notes</label>
                <textarea id="vehicleNotes" name="vehicleNotes" />
              </div>
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Add Customer</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
