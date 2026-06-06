import Link from "next/link";
import { redirect } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { InventorySearch } from "./search/InventorySearch";

type InventoryPageProps = {
  searchParams?: Promise<{
    updated?: string;
  }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;

  const items = await prisma.inventoryItem.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    take: 50,
  });

  const defaultItems = items.map((item) => ({
    id: item.id,
    category: item.category,
    name: item.name,
    partNumber: item.partNumber,
    brand: item.brand,
    quantity: item.quantity,
    cost: item.cost.toString(),
    sellPrice: item.sellPrice.toString(),
    regularTireDisposal: item.regularTireDisposal,
    semiTireDisposal: item.semiTireDisposal,
    lowStockThreshold: item.lowStockThreshold,
    tireSize: item.tireSize,
    model: item.model,
    loadRating: item.loadRating,
    notes: item.notes,
  }));

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="placeholder-panel">
        <p className="eyebrow">Inventory</p>
        <h1>Inventory</h1>
        <p className="helper">
          Manage part numbers, pricing, quantities, and stock levels.
        </p>

        {params?.updated === "1" ? (
          <p className="success">Inventory item updated.</p>
        ) : null}

        <div className="section-grid section-grid-single">
          <Link className="section-card" href="/inventory/add">
            <span className="dashboard-icon" aria-hidden="true">
              <PackagePlus size={26} strokeWidth={2.2} />
            </span>
            <span className="dashboard-card-text">
              <strong>Add Inventory</strong>
              <span>Add new tires, parts, pricing, and starting quantity.</span>
            </span>
          </Link>
        </div>

        <div className="form-section service-preview">
          <h2>Current Inventory</h2>
          <InventorySearch defaultItems={defaultItems} />
        </div>
      </section>
    </main>
  );
}
