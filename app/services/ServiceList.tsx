"use client";

import { Search, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { searchServices } from "@/app/actions";

type ServiceListItem = {
  id: number;
  category: string;
  name: string;
  description: string | null;
  pricingMethod: string;
  flatPrice: string | null;
  hourlyRate: string | null;
  estimatedHours: string | null;
  active: boolean;
  notes: string | null;
};

type ServiceListProps = {
  services: ServiceListItem[];
};

function formatCategory(category: string) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ServiceList({ services }: ServiceListProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ServiceListItem[]>(services);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedQuery = query.trim();

      if (normalizedQuery.length < 2) {
        setResults(services);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchServices(normalizedQuery);
        setResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [query, services]);

  if (services.length === 0) {
    return (
      <div className="empty-state">
        <Wrench size={28} strokeWidth={2.2} />
        <h2>No services yet</h2>
        <p>Add the common shop services Logan wants available for invoices.</p>
        <Link className="secondary-link-button" href="/services/add">
          Add Service
        </Link>
      </div>
    );
  }

  return (
    <div className="inventory-search">
      <div className="search-box">
        <Search aria-hidden="true" size={22} strokeWidth={2.2} />
        <input
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search services..."
          value={query}
        />
      </div>

      <div className="search-status">
        {query.trim().length < 2
          ? `Showing first ${services.length} service${
              services.length === 1 ? "" : "s"
            }. Search to find more.`
          : isPending
            ? "Searching..."
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </div>

      {results.length > 0 ? (
        <div className="service-list">
          {results.map((service) => (
            <article className="search-result-card" key={service.id}>
              <div>
                <p className="eyebrow">{formatCategory(service.category)}</p>
                <h2>{service.name}</h2>
                <p>{service.description || "No description entered."}</p>
                <Link
                  className="secondary-link-button inline-action-link"
                  href={`/services/${service.id}/edit`}
                >
                  Edit
                </Link>
              </div>
              <div className="inventory-metrics">
                <span>
                  Method
                  <strong>
                    {service.pricingMethod === "flat" ? "Flat" : "Hourly"}
                  </strong>
                </span>
                <span>
                  Price
                  <strong>
                    {service.pricingMethod === "flat"
                      ? `$${service.flatPrice ?? "0.00"}`
                      : `$${service.hourlyRate ?? "0.00"}/hr`}
                  </strong>
                </span>
                {service.estimatedHours ? (
                  <span>
                    Est.
                    <strong>{service.estimatedHours}h</strong>
                  </span>
                ) : null}
              </div>
              {service.notes ? <p className="result-notes">{service.notes}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No matching services</h2>
          <p>Try searching by service name, category, pricing method, or notes.</p>
        </div>
      )}
    </div>
  );
}
