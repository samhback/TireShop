"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { searchInventory } from "@/app/actions";

type InventorySearchResult = Awaited<ReturnType<typeof searchInventory>>[number];

type InventorySearchProps = {
  defaultItems: InventorySearchResult[];
};

function formatCategory(category: string) {
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function resultSubtitle(result: InventorySearchResult) {
  return [
    result.brand,
    result.model,
    result.tireSize,
    result.loadRating,
    result.partNumber ? `Part # ${result.partNumber}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function InventorySearch({ defaultItems }: InventorySearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InventorySearchResult[]>(defaultItems);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setResults(defaultItems);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchInventory(query);
        setResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [defaultItems, query]);

  return (
    <div className="inventory-search">
      <div className="search-box">
        <Search aria-hidden="true" size={22} strokeWidth={2.2} />
        <input
          autoComplete="off"
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search inventory..."
          value={query}
        />
      </div>

      <div className="search-status">
        {query.trim().length < 2
          ? `Showing first ${defaultItems.length} item${
              defaultItems.length === 1 ? "" : "s"
            }. Search to find more.`
          : isPending
            ? "Searching..."
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </div>

      {results.length > 0 ? (
        <div className="search-results">
          {results.map((result) => (
            <article className="search-result-card" key={result.id}>
              <div>
                <span className="role-label">
                  {formatCategory(result.category)}
                </span>
                <h2>{result.name}</h2>
                <p>{resultSubtitle(result) || "No additional details"}</p>
                <Link
                  className="secondary-link-button inline-action-link"
                  href={`/inventory/${result.id}/edit`}
                >
                  Edit
                </Link>
              </div>

              <div className="inventory-metrics">
                <span>
                  <strong>{result.quantity}</strong>
                  Qty
                </span>
                <span>
                  <strong>${result.cost}</strong>
                  Cost Each
                </span>
                <span>
                  <strong>${result.sellPrice}</strong>
                  Sell Each
                </span>
              </div>

              {result.notes ? <p className="result-notes">{result.notes}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No matching inventory</h2>
          <p>Try searching by item name, part number, brand, category, or notes.</p>
        </div>
      )}
    </div>
  );
}
