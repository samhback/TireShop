import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { CustomerSearch } from "./CustomerSearch";

export default async function CustomersPage() {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const customers = await prisma.customer.findMany({
    include: {
      company: true,
      vehicles: {
        include: {
          _count: {
            select: {
              invoices: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    take: 50,
  });

  const defaultCustomers = customers.map((customer) => ({
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone,
    email: customer.email,
    company: customer.company
      ? {
          id: customer.company.id,
          name: customer.company.name,
        }
      : null,
    notes: customer.notes,
    vehicles: customer.vehicles.map((vehicle) => ({
      id: vehicle.id,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      vin: vehicle.vin,
      licensePlate: vehicle.licensePlate,
      color: vehicle.color,
      mileage: vehicle.mileage,
      engineSize: vehicle.engineSize,
      transmissionType: vehicle.transmissionType,
      transmissionDetails: vehicle.transmissionDetails,
      fuelType: vehicle.fuelType,
      driveType: vehicle.driveType,
      tireSize: vehicle.tireSize,
      historyCount: vehicle._count.invoices,
    })),
  }));

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <p className="eyebrow">Customers</p>
        <h1>Customers</h1>
        <p className="helper">
          Manage customer records, vehicles, tire sizes, and maintenance notes.
        </p>

        <div className="section-grid section-grid-single">
          <Link className="section-card" href="/customers/add">
            <span className="dashboard-icon" aria-hidden="true">
              <UserPlus size={26} strokeWidth={2.2} />
            </span>
            <span className="dashboard-card-text">
              <strong>Add Customer</strong>
              <span>Add customer contact info and their first vehicle.</span>
            </span>
          </Link>
        </div>

        <div className="form-section service-preview">
          <h2>Current Customers</h2>
          <CustomerSearch defaultCustomers={defaultCustomers} />
        </div>
      </section>
    </main>
  );
}
