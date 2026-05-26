import Link from "next/link";
import { redirect } from "next/navigation";
import { getEmployeeSession } from "@/lib/session";
import { OrderCustomerSearch } from "./OrderCustomerSearch";

type NewOrderPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function NewOrderPage({ searchParams }: NewOrderPageProps) {
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
        <Link className="back-link" href="/orders">
          Back to Orders
        </Link>

        <p className="eyebrow">New Order</p>
        <h1>Find Customer</h1>
        <p className="helper">
          Search first. Once a customer is selected, a draft order is saved immediately.
        </p>

        {params?.error === "customer" ? (
          <p className="error">Choose a valid customer to start the order.</p>
        ) : null}

        <OrderCustomerSearch />
      </section>
    </main>
  );
}
