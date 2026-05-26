import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, PlusCircle } from "lucide-react";
import { getEmployeeSession } from "@/lib/session";

export default async function OrdersPage() {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="placeholder-panel">
        <p className="eyebrow">Orders</p>
        <h1>Orders</h1>
        <p className="helper">
          Start a saved draft order from a customer, attach a vehicle, and manage active work.
        </p>

        <div className="section-grid">
          <Link className="section-card" href="/orders/new">
            <span className="dashboard-icon" aria-hidden="true">
              <PlusCircle size={26} strokeWidth={2.2} />
            </span>
            <span className="dashboard-card-text">
              <strong>New Order</strong>
              <span>Find a customer and create a saved draft order.</span>
            </span>
          </Link>

          <Link className="section-card" href="/orders/manage">
            <span className="dashboard-icon" aria-hidden="true">
              <ClipboardList size={26} strokeWidth={2.2} />
            </span>
            <span className="dashboard-card-text">
              <strong>Manage Orders</strong>
              <span>Search by customer, vehicle, plate, or order number.</span>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}
