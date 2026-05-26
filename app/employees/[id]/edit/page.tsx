import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateEmployeeProfile } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";

type EditEmployeePageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function EditEmployeePage({
  params,
  searchParams,
}: EditEmployeePageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const employeeId = Number(id);

  if (!Number.isInteger(employeeId)) {
    notFound();
  }

  const profile = await prisma.employeeProfile.findUnique({
    where: {
      id: employeeId,
    },
  });

  if (!profile) {
    notFound();
  }

  const paramsValue = await searchParams;

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/employees">
          Back to Employees
        </Link>

        <p className="eyebrow">Edit Employee</p>
        <h1>{profile.name}</h1>
        <p className="helper">Update basic employee contact information.</p>

        {paramsValue?.error === "invalid" ? (
          <p className="error">Employee name is required.</p>
        ) : null}

        <form className="customer-form" action={updateEmployeeProfile}>
          <input name="employeeId" type="hidden" value={profile.id} />

          <div className="form-section">
            <h2>Contact Info</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input
                  defaultValue={profile.name}
                  id="name"
                  name="name"
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input defaultValue={profile.phone ?? ""} id="phone" name="phone" />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  defaultValue={profile.email ?? ""}
                  id="email"
                  name="email"
                  type="email"
                />
              </div>
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Save Employee</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
