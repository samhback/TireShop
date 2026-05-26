"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { createDraftOrderForCustomer, searchCustomers } from "@/app/actions";

type CustomerResult = Awaited<ReturnType<typeof searchCustomers>>[number];

export function OrderCustomerSearch() {
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
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer name, phone, vehicle, plate, or VIN..."
          value={query}
        />
      </div>

      <div className="search-status">
        {query.trim().length < 2
          ? "Search for the customer to start a saved draft order."
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
                <form action={createDraftOrderForCustomer}>
                  <input name="customerId" type="hidden" value={customer.id} />
                  <button className="secondary-button" type="submit">
                    Start Order
                  </button>
                </form>
              </div>

              <p>{[customer.phone, customer.email].filter(Boolean).join(" | ")}</p>

              {customer.vehicles.length > 0 ? (
                <div className="vehicle-list">
                  {customer.vehicles.map((vehicle) => (
                    <span key={vehicle.id}>
                      {[
                        vehicle.color,
                        vehicle.year,
                        vehicle.make,
                        vehicle.model,
                        vehicle.licensePlate ? `Plate ${vehicle.licensePlate}` : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    </span>
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
          <p>Add the customer first, then return here to start the order.</p>
          <Link className="secondary-link-button" href="/customers/add">
            Add Customer
          </Link>
        </div>
      ) : null}
    </div>
  );
}
