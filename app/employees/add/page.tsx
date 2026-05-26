import Link from "next/link";
import { redirect } from "next/navigation";
import { createEmployeeProfile } from "@/app/actions";
import { UnsavedHomeLink } from "@/app/UnsavedHomeLink";
import { getEmployeeSession } from "@/lib/session";

type AddEmployeePageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

export default async function AddEmployeePage({
  searchParams,
}: AddEmployeePageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="placeholder-shell">
      <UnsavedHomeLink />

      <section className="wide-panel">
        <Link className="back-link" href="/employees">
          Back to Employees
        </Link>

        <p className="eyebrow">Add Employee</p>
        <h1>Employee Contact</h1>
        <p className="helper">Add basic employee contact information.</p>

        {params?.created === "1" ? (
          <p className="success">Employee added.</p>
        ) : null}

        {params?.error === "invalid" ? (
          <p className="error">Employee name is required.</p>
        ) : null}

        <form className="customer-form" action={createEmployeeProfile} data-unsaved-guard>
          <div className="form-section">
            <h2>Contact Info</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Name</label>
                <input id="name" name="name" required />
              </div>

              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" />
              </div>
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Add Employee</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
