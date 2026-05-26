import Link from "next/link";
import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/session";
import { CustomerSearch } from "../CustomerSearch";

export default async function SearchCustomerPage() {
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
        <Link className="back-link" href="/customers">
          Back to Customers
        </Link>

        <p className="eyebrow">Search Customer</p>
        <h1>Find Customer</h1>
        <p className="helper">
          Search by name, phone, email, VIN, plate, vehicle, or tire size.
        </p>

        <CustomerSearch />
      </section>
    </main>
  );
}
