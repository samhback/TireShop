import Link from "next/link";
import { redirect } from "next/navigation";
import { inventoryCategories } from "@/lib/inventoryCategories";
import { getEmployeeSession } from "@/lib/session";

export default async function AddInventoryPage() {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <p className="eyebrow">Add Inventory</p>
        <h1>Choose Inventory Type</h1>
        <p className="helper">
          Pick the category that best matches the item being added.
        </p>

        <div className="category-grid">
          {inventoryCategories.map((category) => {
            const Icon = category.icon;

            return (
              <Link
                className="section-card"
                href={`/inventory/add/${category.slug}`}
                key={category.slug}
              >
                <span className="dashboard-icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={2.2} />
                </span>
                <span className="dashboard-card-text">
                  <strong>{category.label}</strong>
                  <span>{category.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
