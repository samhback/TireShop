"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { searchInvoices } from "@/app/actions";

type InvoiceSearchResult = Awaited<ReturnType<typeof searchInvoices>>[number];

type InvoiceListProps = {
  defaultInvoices: InvoiceSearchResult[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function money(value: string) {
  return Number(value).toFixed(2);
}

function vehicleText(invoice: InvoiceSearchResult) {
  if (!invoice.vehicle) {
    return "No vehicle attached";
  }

  return [
    invoice.vehicle.color,
    invoice.vehicle.year,
    invoice.vehicle.make,
    invoice.vehicle.model,
    invoice.vehicle.licensePlate ? `Plate ${invoice.vehicle.licensePlate}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function InvoiceList({ defaultInvoices }: InvoiceListProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InvoiceSearchResult[]>(defaultInvoices);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedQuery = query.trim();

      if (normalizedQuery.length < 2) {
        setResults(defaultInvoices);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchInvoices(normalizedQuery);
        setResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [defaultInvoices, query]);

  return (
    <div className="inventory-search">
      <div className="search-box">
        <Search aria-hidden="true" size={22} strokeWidth={2.2} />
        <input
          autoComplete="off"
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search invoices by customer, vehicle, plate, invoice, or order number..."
          value={query}
        />
      </div>

      <div className="search-status">
        {query.trim().length < 2
          ? `Showing first ${defaultInvoices.length} invoice${
              defaultInvoices.length === 1 ? "" : "s"
            }. Search to find more.`
          : isPending
            ? "Searching..."
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </div>

      {results.length > 0 ? (
        <div className="search-results">
          {results.map((invoice) => (
            <article className="search-result-card" key={invoice.id}>
              <div>
                <span className="role-label">{invoice.status}</span>
                <h2>{invoice.invoiceNumber}</h2>
                <p>
                  {invoice.customer.firstName} {invoice.customer.lastName} |{" "}
                  {invoice.customer.phone}
                </p>
                <p>{vehicleText(invoice)}</p>
                <p>Order {invoice.orderNumber}</p>
                <Link
                  className="secondary-link-button inline-action-link"
                  href={`/invoices/${invoice.id}`}
                >
                  Open Invoice
                </Link>
              </div>

              <div className="inventory-metrics">
                <span>
                  Total
                  <strong>${money(invoice.total)}</strong>
                </span>
                <span>
                  Created
                  <strong>{formatDate(invoice.createdAt)}</strong>
                </span>
                {invoice.paidAt ? (
                  <span>
                    Paid
                    <strong>{formatDate(invoice.paidAt)}</strong>
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No matching invoices</h2>
          <p>Try searching by customer, vehicle, plate, invoice, or order number.</p>
        </div>
      )}
    </div>
  );
}
