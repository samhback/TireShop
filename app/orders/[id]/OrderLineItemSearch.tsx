"use client";

import { Search } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import {
  addInventoryToOrder,
  addServiceToOrder,
  searchInventory,
  searchServices,
} from "@/app/actions";

type ServiceResult = Awaited<ReturnType<typeof searchServices>>[number];
type InventoryResult = Awaited<ReturnType<typeof searchInventory>>[number];

type OrderLineItemSearchProps = {
  companyMarkupPercent: string | null;
  orderId: number;
  reservedInventoryQuantities: Record<number, number>;
};

function servicePrice(service: ServiceResult) {
  return service.pricingMethod === "flat"
    ? `$${service.flatPrice ?? "0.00"}`
    : `$${service.hourlyRate ?? "0.00"}/hr`;
}

function inventorySubtitle(item: InventoryResult) {
  return [
    item.brand,
    item.model,
    item.tireSize,
    item.partNumber ? `Part # ${item.partNumber}` : null,
  ]
    .filter(Boolean)
    .join(" | ");
}

export function OrderLineItemSearch({
  companyMarkupPercent,
  orderId,
  reservedInventoryQuantities,
}: OrderLineItemSearchProps) {
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceResults, setServiceResults] = useState<ServiceResult[]>([]);
  const [inventoryQuery, setInventoryQuery] = useState("");
  const [inventoryResults, setInventoryResults] = useState<InventoryResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const markupPercent =
    companyMarkupPercent === null ? null : Number(companyMarkupPercent);

  function inventoryPrice(item: InventoryResult) {
    if (markupPercent === null || Number.isNaN(markupPercent)) {
      return Number(item.sellPrice).toFixed(2);
    }

    return (Number(item.cost) * (1 + markupPercent / 100)).toFixed(2);
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (serviceQuery.trim().length < 2) {
        setServiceResults([]);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchServices(serviceQuery);
        setServiceResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [serviceQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (inventoryQuery.trim().length < 2) {
        setInventoryResults([]);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchInventory(inventoryQuery);
        setInventoryResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [inventoryQuery]);

  return (
    <div className="order-builder-grid">
      <div className="customer-search-panel">
        <h2>Add Service</h2>
        <div className="inventory-search">
          <div className="search-box">
            <Search aria-hidden="true" size={22} strokeWidth={2.2} />
            <input
              autoComplete="off"
              onChange={(event) => setServiceQuery(event.target.value)}
              placeholder="Search services..."
              value={serviceQuery}
            />
          </div>
          <div className="search-status">
            {serviceQuery.trim().length < 2
              ? "Type at least 2 characters."
              : isPending
                ? "Searching..."
                : `${serviceResults.length} service${
                    serviceResults.length === 1 ? "" : "s"
                  }`}
          </div>
          <div className="compact-result-list">
            {serviceResults.map((service) => (
              <article className="customer-result-card" key={service.id}>
                <div className="customer-result-header">
                  <div>
                    <h3>{service.name}</h3>
                    <p>{servicePrice(service)}</p>
                  </div>
                  <form action={addServiceToOrder} data-preserve-scroll="true">
                    <input name="orderId" type="hidden" value={orderId} />
                    <input name="serviceId" type="hidden" value={service.id} />
                    <button className="secondary-button" type="submit">
                      Add
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="customer-search-panel">
        <h2>Add Inventory</h2>
        <div className="inventory-search">
          <div className="search-box">
            <Search aria-hidden="true" size={22} strokeWidth={2.2} />
            <input
              autoComplete="off"
              onChange={(event) => setInventoryQuery(event.target.value)}
              placeholder="Search inventory..."
              value={inventoryQuery}
            />
          </div>
          <div className="search-status">
            {inventoryQuery.trim().length < 2
              ? "Type at least 2 characters."
              : isPending
                ? "Searching..."
                : `${inventoryResults.length} item${
                    inventoryResults.length === 1 ? "" : "s"
                  }`}
          </div>
          <div className="compact-result-list">
            {inventoryResults.map((item) => {
              const availableQuantity =
                item.quantity - (reservedInventoryQuantities[item.id] ?? 0);

              return (
                <article className="customer-result-card" key={item.id}>
                  <div className="customer-result-header">
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        ${inventoryPrice(item)} | Available {availableQuantity}
                      </p>
                      {item.regularTireDisposal || item.semiTireDisposal ? (
                        <p>
                          {[
                            item.regularTireDisposal
                              ? "Regular disposal $3"
                              : null,
                            item.semiTireDisposal ? "Semi disposal $6" : null,
                          ]
                            .filter(Boolean)
                            .join(" | ")}
                        </p>
                      ) : null}
                      <p>{inventorySubtitle(item) || "No additional details"}</p>
                    </div>
                    <form
                      action={addInventoryToOrder}
                      className="inline-qty-form"
                      data-preserve-scroll="true"
                    >
                      <input name="orderId" type="hidden" value={orderId} />
                      <input
                        name="inventoryItemId"
                        type="hidden"
                        value={item.id}
                      />
                      <label>
                        Qty
                        <input
                          defaultValue="1"
                          disabled={availableQuantity <= 0}
                          max={Math.max(availableQuantity, 0)}
                          min="1"
                          name="quantity"
                          type="number"
                        />
                      </label>
                      <button
                        className="secondary-button"
                        disabled={availableQuantity <= 0}
                        type="submit"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
