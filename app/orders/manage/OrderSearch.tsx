"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { searchOrders } from "@/app/actions";

type OrderSearchResult = Awaited<ReturnType<typeof searchOrders>>[number];

type OrderSearchProps = {
  defaultOrders: OrderSearchResult[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function vehicleText(order: OrderSearchResult) {
  if (!order.vehicle) {
    return "No vehicle attached";
  }

  return [
    order.vehicle.color,
    order.vehicle.year,
    order.vehicle.make,
    order.vehicle.model,
    order.vehicle.licensePlate ? `Plate ${order.vehicle.licensePlate}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

export function OrderSearch({ defaultOrders }: OrderSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OrderSearchResult[]>(defaultOrders);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setResults(defaultOrders);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchOrders(query);
        setResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [defaultOrders, query]);

  return (
    <div className="inventory-search">
      <div className="search-box">
        <Search aria-hidden="true" size={22} strokeWidth={2.2} />
        <input
          autoComplete="off"
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search orders by customer, vehicle, plate, VIN, or order number..."
          value={query}
        />
      </div>

      <div className="search-status">
        {query.trim().length < 2
          ? `Showing first ${defaultOrders.length} order${
              defaultOrders.length === 1 ? "" : "s"
            }. Search to find more.`
          : isPending
            ? "Searching..."
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </div>

      {results.length > 0 ? (
        <div className="search-results">
          {results.map((order) => (
            <article className="search-result-card" key={order.id}>
              <div>
                <span className="role-label">{order.status}</span>
                <h2>{order.orderNumber}</h2>
                <p>
                  {order.customer.firstName} {order.customer.lastName} |{" "}
                  {order.customer.phone}
                </p>
                <p>{vehicleText(order)}</p>
                <Link
                  className="secondary-link-button inline-action-link"
                  href={`/orders/${order.id}`}
                >
                  Open Order
                </Link>
              </div>

              <div className="inventory-metrics">
                <span>
                  Updated
                  <strong>{formatDate(order.updatedAt)}</strong>
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No matching orders</h2>
          <p>Try searching by customer, vehicle, plate, VIN, or order number.</p>
        </div>
      )}
    </div>
  );
}
