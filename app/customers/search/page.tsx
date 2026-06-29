import Link from "next/link";
import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/session";
import { CustomerSearch } from "../CustomerSearch";

type SearchCustomerPageProps = {
  searchParams?: Promise<{
    deleted?: string;
  }>;
};

export default async function SearchCustomerPage({
  searchParams,
}: SearchCustomerPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const query = await searchParams;

  return (
    <main className="placeholder-shell">
      <Link className="home-link" href="/employee-home">
        Home
      </Link>

      <section className="wide-panel">
        <Link className="back-link" href="/customers">
          Back to Customers
        </Link>

        <p className="eyebrow">Search Customer</p>
        <h1>Find Customer</h1>
        <p className="helper">
          Search by name, phone, email, VIN, plate, vehicle, or tire size.
        </p>

        {query?.deleted === "1" ? (
          <p className="success">Customer deleted.</p>
        ) : null}

        <CustomerSearch />
      </section>
    </main>
  );
}
