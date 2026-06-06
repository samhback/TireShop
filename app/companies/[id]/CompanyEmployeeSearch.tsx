"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { attachCustomerToCompany, searchCustomers } from "@/app/actions";

type CustomerResult = Awaited<ReturnType<typeof searchCustomers>>[number];

type CompanyEmployeeSearchProps = {
  companyId: number;
};

export function CompanyEmployeeSearch({
  companyId,
}: CompanyEmployeeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchCustomers(query);
        setResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="inventory-search">
      <div className="search-box">
        <Search aria-hidden="true" size={22} strokeWidth={2.2} />
        <input
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search existing customers..."
          value={query}
        />
      </div>

      <div className="search-status">
        {query.trim().length < 2
          ? "Search for an existing customer to tag as a company employee."
          : isPending
            ? "Searching..."
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </div>

      {results.length > 0 ? (
        <div className="compact-result-list">
          {results.map((customer) => (
            <article className="customer-result-card" key={customer.id}>
              <div className="customer-result-header">
                <div>
                  <h3>
                    {customer.firstName} {customer.lastName}
                  </h3>
                  <p>
                    {[customer.phone, customer.email].filter(Boolean).join(" | ")}
                  </p>
                  {customer.company ? (
                    <p>Current company: {customer.company.name}</p>
                  ) : null}
                </div>
                <form action={attachCustomerToCompany}>
                  <input name="companyId" type="hidden" value={companyId} />
                  <input name="customerId" type="hidden" value={customer.id} />
                  <button className="secondary-button" type="submit">
                    Add Employee
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {query.trim().length >= 2 && !isPending && results.length === 0 ? (
        <div className="empty-state">
          <h2>No customer found</h2>
          <p>Create the customer first, then they will be tagged to this company.</p>
          <Link
            className="secondary-link-button"
            href={`/customers/add?companyId=${companyId}&returnToCompanyId=${companyId}`}
          >
            Create Customer
          </Link>
        </div>
      ) : null}
    </div>
  );
}
