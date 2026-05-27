import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateServiceItem } from "@/app/actions";
import { salesCategoryOptions } from "@/lib/salesCategories";
import { serviceCategoryOptions } from "@/lib/serviceOptions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { PricingFields } from "../../add/PricingFields";

type EditServicePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function EditServicePage({
  params,
  searchParams,
}: EditServicePageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const serviceId = Number(id);

  if (!Number.isInteger(serviceId)) {
    notFound();
  }

  const service = await prisma.serviceItem.findUnique({
    where: {
      id: serviceId,
    },
  });

  if (!service) {
    notFound();
  }

  const query = await searchParams;

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/services">
          Back to Services
        </Link>

        <p className="eyebrow">Edit Service</p>
        <h1>{service.name}</h1>
        <p className="helper">
          Update the service category, pricing method, labor estimate, status,
          and internal notes.
        </p>

        {query?.error === "invalid" ? (
          <p className="error">Check the required service and pricing fields.</p>
        ) : null}

        <form className="customer-form" action={updateServiceItem}>
          <input name="serviceId" type="hidden" value={service.id} />

          <div className="form-section">
            <h2>Service Info</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="category">Category</label>
                <select
                  defaultValue={service.category}
                  id="category"
                  name="category"
                  required
                >
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
                  defaultValue={service.name}
                  id="name"
                  name="name"
                  placeholder="Oil Change"
                  required
                />
              </div>

              <div className="field form-grid-wide">
                <label htmlFor="description">Description</label>
                <input
                  defaultValue={service.description ?? ""}
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
              <PricingFields
                defaultFlatPrice={service.flatPrice?.toString() ?? ""}
                defaultHourlyRate={service.hourlyRate?.toString() ?? ""}
                defaultPricingMethod={service.pricingMethod}
              />

              <div className="field">
                <label htmlFor="estimatedHours">Estimated Hours</label>
                <input
                  defaultValue={service.estimatedHours?.toString() ?? ""}
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
                <select
                  defaultValue={service.salesCategory}
                  id="salesCategory"
                  name="salesCategory"
                >
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
                <input
                  defaultChecked={service.taxable}
                  name="taxable"
                  type="checkbox"
                />
                Taxable
              </label>
              <label>
                <input
                  defaultChecked={service.active}
                  name="active"
                  type="checkbox"
                />
                Active
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>Notes</h2>
            <div className="field">
              <label htmlFor="notes">Internal Notes</label>
              <textarea
                defaultValue={service.notes ?? ""}
                id="notes"
                name="notes"
                placeholder="Includes up to 5 quarts, extra oil billed separately."
              />
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Save Service</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
