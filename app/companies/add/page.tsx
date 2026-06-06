import Link from "next/link";
import { redirect } from "next/navigation";
import { createCompany } from "@/app/actions";
import { getEmployeeSession } from "@/lib/session";

type AddCompanyPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AddCompanyPage({
  searchParams,
}: AddCompanyPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const params = await searchParams;

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/companies">
          Back to Companies
        </Link>

        <p className="eyebrow">Companies</p>
        <h1>Add Company</h1>
        <p className="helper">
          Set company-specific inventory markup for company-car orders.
        </p>

        {params?.error === "invalid" ? (
          <p className="error">Enter a company name and valid markup percent.</p>
        ) : null}

        <form className="customer-form" action={createCompany}>
          <div className="form-section">
            <h2>Company Info</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Company Name</label>
                <input id="name" name="name" required />
              </div>

              <div className="field">
                <label htmlFor="markupPercent">Inventory Markup %</label>
                <input
                  defaultValue="0"
                  id="markupPercent"
                  min="0"
                  name="markupPercent"
                  step="0.01"
                  type="number"
                  required
                />
              </div>

              <div className="field form-grid-wide">
                <label htmlFor="notes">Notes</label>
                <textarea id="notes" name="notes" />
              </div>
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Add Company</span>
            <span className="button-mark" aria-hidden="true">
              +
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
