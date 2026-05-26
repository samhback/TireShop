import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { InventorySearch } from "./InventorySearch";

export default async function SearchInventoryPage() {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

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

      <section className="wide-panel">
        <Link className="back-link" href="/inventory">
          Back to Inventory
        </Link>

        <p className="eyebrow">Search Inventory</p>
        <h1>Find Inventory</h1>
        <p className="helper">
          Search by part number, item name, brand, tire size, category, or notes.
        </p>

        <InventorySearch defaultItems={defaultItems} />
      </section>
    </main>
  );
}
