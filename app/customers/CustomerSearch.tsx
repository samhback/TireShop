"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { searchCustomers } from "@/app/actions";

type CustomerSearchResult = Awaited<ReturnType<typeof searchCustomers>>[number];

type CustomerSearchProps = {
  defaultCustomers?: CustomerSearchResult[];
};

export function CustomerSearch({ defaultCustomers = [] }: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] =
    useState<CustomerSearchResult[]>(defaultCustomers);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setResults(defaultCustomers);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchCustomers(query);
        setResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [defaultCustomers, query]);

  return (
    <div className="inventory-search">
      <div className="search-box">
        <Search aria-hidden="true" size={22} strokeWidth={2.2} />
        <input
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customers..."
          value={query}
        />
      </div>

      <div className="search-status">
        {query.trim().length < 2
          ? defaultCustomers.length > 0
            ? `Showing first ${defaultCustomers.length} customer${
                defaultCustomers.length === 1 ? "" : "s"
              }. Search to find more.`
            : "Type at least 2 characters to search."
          : isPending
            ? "Searching..."
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </div>

      {results.length > 0 ? (
        <div className="search-results">
          {results.map((customer) => (
            <article className="customer-result-card" key={customer.id}>
              <div className="customer-result-header">
                <h3>
                  {customer.firstName} {customer.lastName}
                </h3>
                <Link
                  className="secondary-link-button"
                  href={`/customers/${customer.id}/edit`}
                >
                  Edit
                </Link>
              </div>
              <p>{[customer.phone, customer.email].filter(Boolean).join(" | ")}</p>

              {customer.vehicles.length > 0 ? (
                <div className="vehicle-list">
                  {customer.vehicles.map((vehicle) => (
                    <div className="vehicle-list-row" key={vehicle.id}>
                      <span>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                        {vehicle.licensePlate ? ` | ${vehicle.licensePlate}` : ""}
                        {vehicle.tireSize ? ` | ${vehicle.tireSize}` : ""}
                      </span>
                      {vehicle.historyCount > 0 ? (
                        <Link
                          className="secondary-link-button inline-action-link"
                          href={`/vehicles/${vehicle.id}/history`}
                        >
                          Vehicle History
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : null}

      {query.trim().length >= 2 && !isPending && results.length === 0 ? (
        <div className="empty-state">
          <h2>No customer found</h2>
          <p>Add a new customer record for this search.</p>
          <Link className="secondary-link-button" href="/customers/add">
            Add Customer
          </Link>
        </div>
      ) : null}

      {query.trim().length < 2 && defaultCustomers.length === 0 ? (
        <div className="empty-state">
          <h2>No customers yet</h2>
          <p>Add the first customer record for the shop.</p>
          <Link className="secondary-link-button" href="/customers/add">
            Add Customer
          </Link>
        </div>
      ) : null}
    </div>
  );
}
