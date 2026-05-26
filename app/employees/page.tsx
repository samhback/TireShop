import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { EmployeeList } from "./EmployeeList";

type EmployeesPageProps = {
  searchParams?: Promise<{
    updated?: string;
  }>;
};

export default async function EmployeesPage({ searchParams }: EmployeesPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;
  const employees = await prisma.employeeProfile.findMany({
    orderBy: {
      name: "asc",
    },
    take: 50,
  });

  const employeeList = employees.map((profile) => ({
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
  }));

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <p className="eyebrow">Employees</p>
        <h1>Employees</h1>
        <p className="helper">Store basic employee contact information.</p>

        {params?.updated === "1" ? (
          <p className="success">Employee updated.</p>
        ) : null}

        <div className="section-grid section-grid-single">
          <Link className="section-card" href="/employees/add">
            <span className="dashboard-icon" aria-hidden="true">
              <UserPlus size={26} strokeWidth={2.2} />
            </span>
            <span className="dashboard-card-text">
              <strong>Add Employee</strong>
              <span>Add a name, phone number, and email.</span>
            </span>
          </Link>
        </div>

        <div className="form-section service-preview">
          <h2>Current Employees</h2>
          <EmployeeList employees={employeeList} />
        </div>
      </section>
    </main>
  );
}
