import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceItem } from "@/app/actions";
import { UnsavedHomeLink } from "@/app/UnsavedHomeLink";
import { salesCategoryOptions } from "@/lib/salesCategories";
import { serviceCategoryOptions } from "@/lib/serviceOptions";
import { getEmployeeSession } from "@/lib/session";
import { PricingFields } from "./PricingFields";

type AddServicePageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

export default async function AddServicePage({
  searchParams,
}: AddServicePageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="placeholder-shell">
      <UnsavedHomeLink />

      <section className="wide-panel">
        <Link className="back-link" href="/services">
          Back to Services
        </Link>

        <p className="eyebrow">Add Service</p>
        <h1>Service Setup</h1>
        <p className="helper">
          Create labor and menu services with either a flat price or hourly rate.
        </p>

        {params?.created === "1" ? (
          <p className="success">Service added.</p>
        ) : null}

        {params?.error === "invalid" ? (
          <p className="error">Check the required service and pricing fields.</p>
        ) : null}

        <form className="customer-form" action={createServiceItem} data-unsaved-guard>
          <div className="form-section">
            <h2>Service Info</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="category">Category</label>
                <select id="category" name="category" required>
                  {serviceCategoryOptions.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="name">Service Name</label>
                <input
                  id="name"
                  name="name"
                  placeholder="Oil Change"
                  required
                />
              </div>

              <div className="field form-grid-wide">
                <label htmlFor="description">Description</label>
                <input
                  id="description"
                  name="description"
                  placeholder="Synthetic blend oil change with filter"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Pricing</h2>
            <div className="form-grid">
              <PricingFields />

              <div className="field">
                <label htmlFor="estimatedHours">Estimated Hours</label>
                <input
                  id="estimatedHours"
                  min="0"
                  name="estimatedHours"
                  placeholder="1.50"
                  step="0.01"
                  type="number"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Status</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="salesCategory">Sales Category</label>
                <select defaultValue="labor" id="salesCategory" name="salesCategory">
                  {salesCategoryOptions.map((salesCategory) => (
                    <option key={salesCategory.value} value={salesCategory.value}>
                      {salesCategory.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="option-row">
              <label>
                <input defaultChecked name="taxable" type="checkbox" />
                Taxable
              </label>
              <label>
                <input defaultChecked name="active" type="checkbox" />
                Active
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>Notes</h2>
            <div className="field">
              <label htmlFor="notes">Internal Notes</label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Includes up to 5 quarts, extra oil billed separately."
              />
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Add Service</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
