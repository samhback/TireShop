import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updateCompany } from "@/app/actions";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { CompanyMarkupFields } from "../../CompanyMarkupFields";

type EditCompanyPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function EditCompanyPage({
  params,
  searchParams,
}: EditCompanyPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const companyId = Number(id);

  if (!Number.isInteger(companyId)) {
    notFound();
  }

  const company = await prisma.company.findUnique({
    where: {
      id: companyId,
    },
  });

  if (!company) {
    notFound();
  }

  const paramsValue = await searchParams;

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href={`/companies/${company.id}`}>
          Back to Company
        </Link>

        <p className="eyebrow">Companies</p>
        <h1>Edit {company.name}</h1>
        <p className="helper">
          Optionally update company-specific inventory markup and notes.
        </p>

        {paramsValue?.error === "invalid" ? (
          <p className="error">
            Enter a company name and, when enabled, a valid markup percent.
          </p>
        ) : null}

        <form className="customer-form" action={updateCompany}>
          <input name="companyId" type="hidden" value={company.id} />
          <div className="form-section">
            <h2>Company Info</h2>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="name">Company Name</label>
                <input
                  defaultValue={company.name}
                  id="name"
                  name="name"
                  required
                />
              </div>

              <CompanyMarkupFields
                defaultEnabled={company.useCompanyMarkup}
                defaultMarkupPercent={company.markupPercent.toString()}
              />

              <div className="field form-grid-wide">
                <label htmlFor="notes">Notes</label>
                <textarea
                  defaultValue={company.notes ?? ""}
                  id="notes"
                  name="notes"
                />
              </div>
            </div>
          </div>

          <button className="submit-button inventory-submit" type="submit">
            <span>Save Company</span>
            <span className="button-mark" aria-hidden="true">
              ✓
            </span>
          </button>
        </form>
      </section>
    </main>
  );
}
