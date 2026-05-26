import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { OrderSearch } from "./OrderSearch";

export default async function ManageOrdersPage() {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const orders = await prisma.order.findMany({
    include: {
      customer: true,
      vehicle: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 50,
  });

  const defaultOrders = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    updatedAt: order.updatedAt.toISOString(),
    customer: {
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      phone: order.customer.phone,
    },
    vehicle: order.vehicle
      ? {
          year: order.vehicle.year,
          make: order.vehicle.make,
          model: order.vehicle.model,
          color: order.vehicle.color,
          licensePlate: order.vehicle.licensePlate,
        }
      : null,
  }));

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/orders">
          Back to Orders
        </Link>

        <p className="eyebrow">Manage Orders</p>
        <h1>Manage Orders</h1>
        <p className="helper">
          Find saved drafts by order number, customer, vehicle, color, plate, or VIN.
        </p>

        <OrderSearch defaultOrders={defaultOrders} />
      </section>
    </main>
  );
}
