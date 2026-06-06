import Link from "next/link";
import { redirect } from "next/navigation";
import { createInventoryItem } from "@/app/actions";
import { UnsavedHomeLink } from "@/app/UnsavedHomeLink";
import { getInventoryCategory } from "@/lib/inventoryCategories";
import {
  defaultInventorySalesCategory,
  salesCategoryOptions,
} from "@/lib/salesCategories";
import { getEmployeeSession } from "@/lib/session";
import { TireSmartFill } from "./TireSmartFill";

type AddInventoryCategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

export default async function AddInventoryCategoryPage({
  params,
  searchParams,
}: AddInventoryCategoryPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { category: categorySlug } = await params;
  const category = getInventoryCategory(categorySlug);

  if (!category) {
    redirect("/inventory/add");
  }

  const query = await searchParams;
  const defaultSalesCategory = defaultInventorySalesCategory(category.slug);

  return (
    <main className="placeholder-shell">
      <UnsavedHomeLink />

      <section className="wide-panel">
        <Link className="back-link" href="/inventory/add">
          Back to Add Inventory
        </Link>

        <p className="eyebrow">Add Inventory</p>
        <h1>{category.label}</h1>
        <p className="helper">{category.description}</p>

        {query?.created === "1" ? (
          <p className="success">Inventory item added.</p>
        ) : null}

        {query?.error === "invalid" ? (
          <p className="error">Check the required fields and try again.</p>
        ) : null}

        {category.slug === "tires" ? <TireSmartFill /> : null}

        <form className="inventory-form" action={createInventoryItem} data-unsaved-guard>
          <input name="category" type="hidden" value={category.slug} />

          <div className="form-section">
            <h2>Core Details</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Item Name</label>
                <input
                  id="name"
                  name="name"
                  placeholder={`${category.label} item name`}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="quantity">Quantity On Hand</label>
                <input
                  id="quantity"
                  min="0"
                  name="quantity"
                  type="number"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="cost">Cost Each</label>
                <input
                  id="cost"
                  min="0"
                  name="cost"
                  step="0.01"
                  type="number"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="sellPrice">Sell Price Each</label>
                <input
                  id="sellPrice"
                  min="0"
                  name="sellPrice"
                  step="0.01"
                  type="number"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="lowStockThreshold">Low Stock Threshold</label>
                <input
                  defaultValue="0"
                  id="lowStockThreshold"
                  min="0"
                  name="lowStockThreshold"
                  type="number"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>Accounting</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="salesCategory">Sales Category</label>
                <select
                  defaultValue={defaultSalesCategory}
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
                <input defaultChecked name="taxable" type="checkbox" />
                Taxable
              </label>
              <label>
                <input name="regularTireDisposal" type="checkbox" />
                Regular Tire Disposal
              </label>
              <label>
                <input name="semiTireDisposal" type="checkbox" />
                Semi Tire Disposal
              </label>
            </div>
          </div>

          <div className="form-section">
            <h2>{category.label} Details</h2>
            <div className="form-grid">
              {category.fields.map((field) => (
                <div className="field" key={field.name}>
                  <label htmlFor={field.name}>{field.label}</label>
                  <input
                    id={field.name}
                    name={field.name}
                    placeholder={field.placeholder}
                    required={field.placeholder === "Required"}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Notes</h2>
            <div className="field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Supplier, shelf location, fitment notes, or anything else the shop needs."
              />
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Add {category.label}</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
