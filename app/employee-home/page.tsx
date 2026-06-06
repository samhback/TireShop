import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Boxes,
  Building2,
  ClipboardList,
  FileText,
  ShoppingCart,
  UserRound,
  Wrench,
  Users,
} from "lucide-react";
import { logoutEmployee } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { normalizeUsername } from "@/lib/usernames";

const dashboardItems = [
  {
    title: "Inventory",
    description: "Part numbers, pricing, quantities, and low stock.",
    href: "/inventory",
    icon: Boxes,
  },
  {
    title: "Reports",
    description: "Daily totals, payments received, and open balances.",
    href: "/reports",
    icon: ClipboardList,
  },
  {
    title: "Customers",
    description: "Customer records, vehicles, maintenance logs, and notes.",
    href: "/customers",
    icon: Users,
  },
  {
    title: "Companies",
    description: "Company markup pricing and employee customer records.",
    href: "/companies",
    icon: Building2,
  },
  {
    title: "Orders",
    description: "Start draft orders, attach customers, and manage active work.",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "Services",
    description: "Flat-rate and hourly shop services for invoice line items.",
    href: "/services",
    icon: Wrench,
  },
  {
    title: "Employees",
    description: "Employee names, phone numbers, and emails.",
    href: "/employees",
    icon: UserRound,
  },
  {
    title: "Invoices",
    description: "Create invoices, record payments, and track unpaid work.",
    href: "/invoices",
    icon: FileText,
  },
];

export default async function EmployeeHomePage() {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const currentEmployee = await prisma.employeeLogin.findUnique({
    where: {
      username: normalizeUsername(employee),
    },
    select: {
      isAdmin: true,
    },
  });

  return (
    <main className="employee-home">
      <div className="top-actions">
        {currentEmployee?.isAdmin ? (
          <Link className="admin-link" href="/admin">
            Admin Panel
          </Link>
        ) : null}

        <form action={logoutEmployee}>
          <button className="logout-button" type="submit">
            Log Out
          </button>
        </form>
      </div>

      <section className="dashboard-panel" aria-labelledby="dashboard-title">
        <div className="dashboard-header">
          <div>
            <p className="eyebrow">Healdton Service Center</p>
            <h1 id="dashboard-title">Welcome back!</h1>
            <p className="helper">
              Choose where you need to work in the shop system.
            </p>
          </div>
        </div>

        <div className="dashboard-grid">
          {dashboardItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link className="dashboard-card" href={item.href} key={item.title}>
                <span className="dashboard-icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={2.2} />
                </span>
                <span className="dashboard-card-text">
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
