import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateInventoryItem } from "@/app/actions";
import { getInventoryCategory } from "@/lib/inventoryCategories";
import { prisma } from "@/lib/prisma";
import { salesCategoryOptions } from "@/lib/salesCategories";
import { getEmployeeSession } from "@/lib/session";
import { InventoryPricingFields } from "../../InventoryPricingFields";

type EditInventoryPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

const detailFieldKeys = [
  "partNumber",
  "brand",
  "tireSize",
  "model",
  "loadRating",
  "oilWeight",
  "oilType",
  "packageSize",
  "fluidType",
  "specification",
  "filterType",
  "fitment",
  "batteryGroup",
  "cca",
  "warranty",
  "brakeComponent",
  "position",
  "itemType",
  "sizeOrBulbNumber",
  "supplyType",
  "unit",
  "storageLocation",
  "partType",
] as const;

export default async function EditInventoryPage({
  params,
  searchParams,
}: EditInventoryPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const itemId = Number(id);

  if (!Number.isInteger(itemId)) {
    notFound();
  }

  const item = await prisma.inventoryItem.findUnique({
    where: {
      id: itemId,
    },
  });

  if (!item) {
    notFound();
  }

  const category = getInventoryCategory(item.category);

  if (!category) {
    notFound();
  }

  const query = await searchParams;
  const itemDetails = Object.fromEntries(
    detailFieldKeys.map((key) => [key, item[key]?.toString() ?? ""]),
  );

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/inventory">
          Back to Inventory
        </Link>

        <p className="eyebrow">Edit Inventory</p>
        <h1>{item.name}</h1>
        <p className="helper">
          Update quantity, pricing, part details, and notes for this inventory item.
        </p>

        {query?.error === "invalid" ? (
          <p className="error">Check the required fields and try again.</p>
        ) : null}

        <form className="inventory-form" action={updateInventoryItem}>
          <input name="itemId" type="hidden" value={item.id} />
          <input name="category" type="hidden" value={category.slug} />

          <div className="form-section">
            <h2>Core Details</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Item Name</label>
                <input
                  defaultValue={item.name}
                  id="name"
                  name="name"
                  placeholder={`${category.label} item name`}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="quantity">Quantity On Hand</label>
                <input
                  defaultValue={item.quantity}
                  id="quantity"
                  min="0"
                  name="quantity"
                  type="number"
                  required
                />
              </div>

              <InventoryPricingFields
                defaultCost={item.cost.toString()}
                defaultSellPrice={item.sellPrice.toString()}
              />

              <div className="field">
                <label htmlFor="lowStockThreshold">Low Stock Threshold</label>
                <input
                  defaultValue={item.lowStockThreshold}
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
                  defaultValue={item.salesCategory}
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
                  defaultChecked={item.taxable}
                  name="taxable"
                  type="checkbox"
                />
                Taxable
              </label>
              <label>
                <input
                  defaultChecked={item.regularTireDisposal}
                  name="regularTireDisposal"
                  type="checkbox"
                />
                Regular Tire Disposal
              </label>
              <label>
                <input
                  defaultChecked={item.semiTireDisposal}
                  name="semiTireDisposal"
                  type="checkbox"
                />
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
                    defaultValue={itemDetails[field.name] ?? ""}
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
                defaultValue={item.notes ?? ""}
                id="notes"
                name="notes"
                placeholder="Supplier, shelf location, fitment notes, or anything else the shop needs."
              />
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Save Item</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
