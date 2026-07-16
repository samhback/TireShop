import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  Car,
  ClipboardList,
  DollarSign,
  FileWarning,
  LineChart,
  PackageSearch,
  Receipt,
  UserRound,
  Wrench,
} from "lucide-react";
import { getEmployeeSession } from "@/lib/session";

const reports = [
  {
    title: "Sales Receipts Summary",
    description: "Monthly accounting summary of paid receipts, payment methods, tax, and totals.",
    href: "/reports/sales-receipts-summary",
    icon: Receipt,
  },
  {
    title: "Inventory Part Sales",
    description: "Parts sold by date range with quantity, cost, revenue, tax status, and profit.",
    href: "/reports/inventory-part-sales",
    icon: PackageSearch,
  },
  {
    title: "Revenue Report",
    description: "Invoiced totals, paid totals, unpaid balances, and service vs inventory revenue.",
    href: "/reports/revenue",
    icon: DollarSign,
  },
  {
    title: "Profit Report",
    description: "Estimated gross profit using invoice revenue and current inventory item costs.",
    href: "/reports/profit",
    icon: LineChart,
  },
  {
    title: "Company Profit",
    description: "Estimated gross profit by company-car invoices and inventory cost at sale.",
    href: "/reports/company-profit",
    icon: DollarSign,
  },
  {
    title: "Inventory Used",
    description: "Inventory quantities sold, revenue, estimated cost, and estimated profit.",
    href: "/reports/inventory-used",
    icon: PackageSearch,
  },
  {
    title: "Low Stock",
    description: "Items at or below their reorder threshold.",
    href: "/reports/low-stock",
    icon: Boxes,
  },
  {
    title: "Employee Revenue",
    description: "Invoice revenue by quoted-by employee.",
    href: "/reports/employee-revenue",
    icon: UserRound,
  },
  {
    title: "Service Performed",
    description: "Service count and service revenue by employee who performed the work.",
    href: "/reports/service-performed",
    icon: Wrench,
  },
  {
    title: "Unpaid Invoices",
    description: "Open balances and unpaid invoice aging.",
    href: "/reports/unpaid-invoices",
    icon: FileWarning,
  },
  {
    title: "All Company Paid/Unpaid Invoices",
    description: "Company-car invoices across all companies, filtered by paid or unpaid.",
    href: "/reports/all-company-invoices",
    icon: Building2,
  },
  {
    title: "Customer Activity",
    description: "Top customers, invoice count, revenue, and last visit.",
    href: "/reports/customer-activity",
    icon: Receipt,
  },
  {
    title: "Vehicle History",
    description: "Search invoice and service history by customer or vehicle.",
    href: "/reports/vehicle-history",
    icon: Car,
  },
  {
    title: "Average Repair Order",
    description: "Average invoice size, car count, and invoice count over time.",
    href: "/reports/average-repair-order",
    icon: BarChart3,
  },
];

export default async function ReportsPage() {
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
        <p className="eyebrow">Reports</p>
        <h1>Reports</h1>
        <p className="helper">
          Review revenue, inventory, employees, customers, vehicles, and unpaid work.
        </p>

        <div className="section-grid reports-grid">
          {reports.map((report) => {
            const Icon = report.icon;

            return (
              <Link className="section-card" href={report.href} key={report.href}>
                <span className="dashboard-icon" aria-hidden="true">
                  <Icon size={26} strokeWidth={2.2} />
                </span>
                <span className="dashboard-card-text">
                  <strong>{report.title}</strong>
                  <span>{report.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
