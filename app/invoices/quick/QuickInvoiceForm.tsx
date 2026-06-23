"use client";

import { PackagePlus, Plus, Trash2, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { createQuickInvoice } from "@/app/actions";

type EmployeeOption = {
  id: number;
  name: string;
};

type CompanyOption = {
  id: number;
  name: string;
  useCompanyMarkup: boolean;
  markupPercent: string;
};

type ServiceOption = {
  id: number;
  category: string;
  salesCategory: string;
  name: string;
  pricingMethod: string;
  flatPrice: string | null;
  hourlyRate: string | null;
  estimatedHours: string | null;
};

type InventoryOption = {
  id: number;
  category: string;
  salesCategory: string;
  name: string;
  brand: string | null;
  partNumber: string | null;
  tireSize: string | null;
  quantity: number;
  cost: string;
  sellPrice: string;
  regularTireDisposal: boolean;
  semiTireDisposal: boolean;
};

type QuickLine = {
  id: number;
  quantity: number;
};

type QuickInvoiceFormProps = {
  companies: CompanyOption[];
  employees: EmployeeOption[];
  services: ServiceOption[];
  inventoryItems: InventoryOption[];
};

function servicePrice(service: ServiceOption) {
  return service.pricingMethod === "hourly"
    ? `$${service.hourlyRate ?? "0.00"}/hr`
    : `$${service.flatPrice ?? "0.00"}`;
}

function serviceDefaultQuantity(service: ServiceOption) {
  if (service.pricingMethod === "hourly" && service.estimatedHours) {
    return Number(service.estimatedHours);
  }

  return 1;
}

function inventoryLabel(item: InventoryOption) {
  return [
    item.name,
    item.brand,
    item.partNumber ? `Part # ${item.partNumber}` : null,
    item.tireSize,
    `Available ${item.quantity}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

function money(value: number) {
  return value.toFixed(2);
}

export function QuickInvoiceForm({
  companies,
  employees,
  services,
  inventoryItems,
}: QuickInvoiceFormProps) {
  const [selectedServiceId, setSelectedServiceId] = useState(
    services[0]?.id.toString() ?? "",
  );
  const [selectedInventoryId, setSelectedInventoryId] = useState(
    inventoryItems[0]?.id.toString() ?? "",
  );
  const [serviceLines, setServiceLines] = useState<QuickLine[]>([]);
  const [inventoryLines, setInventoryLines] = useState<QuickLine[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isCompanyCar, setIsCompanyCar] = useState(false);

  const serviceMap = useMemo(
    () => new Map(services.map((service) => [service.id, service])),
    [services],
  );
  const inventoryMap = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems],
  );
  const companyMap = useMemo(
    () => new Map(companies.map((company) => [company.id, company])),
    [companies],
  );
  const selectedCompany = selectedCompanyId
    ? companyMap.get(Number(selectedCompanyId))
    : null;

  function inventoryUnitPrice(item: InventoryOption) {
    if (
      !isCompanyCar ||
      !selectedCompany ||
      !selectedCompany.useCompanyMarkup
    ) {
      return Number(item.sellPrice);
    }

    return Number(
      (
        Number(item.cost) *
        (1 + Number(selectedCompany.markupPercent) / 100)
      ).toFixed(2),
    );
  }

  function addService() {
    const serviceId = Number(selectedServiceId);
    const service = serviceMap.get(serviceId);

    if (!service) {
      return;
    }

    setServiceLines((lines) => [
      ...lines,
      {
        id: service.id,
        quantity: serviceDefaultQuantity(service),
      },
    ]);
  }

  function addInventory() {
    const inventoryId = Number(selectedInventoryId);
    const item = inventoryMap.get(inventoryId);

    if (!item) {
      return;
    }

    setInventoryLines((lines) => [
      ...lines,
      {
        id: item.id,
        quantity: 1,
      },
    ]);
  }

  function updateServiceLine(index: number, quantity: number) {
    setServiceLines((lines) =>
      lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, quantity } : line,
      ),
    );
  }

  function updateInventoryLine(index: number, quantity: number) {
    setInventoryLines((lines) =>
      lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, quantity } : line,
      ),
    );
  }

  function removeServiceLine(index: number) {
    setServiceLines((lines) => lines.filter((_, lineIndex) => lineIndex !== index));
  }

  function removeInventoryLine(index: number) {
    setInventoryLines((lines) =>
      lines.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  const estimatedTotal = [
    ...serviceLines.map((line) => {
      const service = serviceMap.get(line.id);
      const unitPrice = Number(
        service?.pricingMethod === "hourly"
          ? service.hourlyRate ?? 0
          : service?.flatPrice ?? 0,
      );

      return line.quantity * unitPrice;
    }),
    ...inventoryLines.map((line) => {
      const item = inventoryMap.get(line.id);
      const disposalFee =
        (item?.regularTireDisposal ? 3 : 0) +
        (item?.semiTireDisposal ? 6 : 0);

      return line.quantity * ((item ? inventoryUnitPrice(item) : 0) + disposalFee);
    }),
  ].reduce((sum, value) => sum + value, 0);

  return (
    <form className="customer-form" action={createQuickInvoice}>
      <input name="serviceLines" type="hidden" value={JSON.stringify(serviceLines)} />
      <input
        name="inventoryLines"
        type="hidden"
        value={JSON.stringify(inventoryLines)}
      />

      <div className="form-section">
        <h2>Invoice Info</h2>
        <div className="form-grid">
          <label>
            Customer Name
            <input
              autoComplete="name"
              name="customerName"
              placeholder="Example: John Smith"
              required
            />
          </label>

          <label>
            Quoted By
            <select name="quotedByEmployeeId" required>
              <option value="">Choose employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Company
            <select
              name="companyId"
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              value={selectedCompanyId}
            >
              <option value="">No company</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>

          <label className="checkbox-line">
            <input
              checked={isCompanyCar}
              name="isCompanyCar"
              onChange={(event) => setIsCompanyCar(event.target.checked)}
              type="checkbox"
            />
            Company Car
          </label>
        </div>
      </div>

      <div className="order-builder-grid">
        <section className="customer-search-panel">
          <h2>
            <Wrench aria-hidden="true" size={20} strokeWidth={2.2} />
            Services
          </h2>
          <div className="inline-add-row">
            <select
              onChange={(event) => setSelectedServiceId(event.target.value)}
              value={selectedServiceId}
            >
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {servicePrice(service)}
                </option>
              ))}
            </select>
            <button className="secondary-button" onClick={addService} type="button">
              <Plus aria-hidden="true" size={18} strokeWidth={2.3} />
              Add
            </button>
          </div>

          <div className="compact-result-list">
            {serviceLines.map((line, index) => {
              const service = serviceMap.get(line.id);

              if (!service) {
                return null;
              }

              return (
                <article className="customer-result-card" key={`${line.id}-${index}`}>
                  <div className="customer-result-header">
                    <div>
                      <h3>{service.name}</h3>
                      <p>
                        {service.category} | {servicePrice(service)}
                      </p>
                    </div>
                    <div className="inline-qty-form">
                      <label>
                        {service.pricingMethod === "hourly" ? "Hours" : "Qty"}
                        <input
                          min="0.01"
                          onChange={(event) =>
                            updateServiceLine(index, Number(event.target.value))
                          }
                          step="0.01"
                          type="number"
                          value={line.quantity}
                        />
                      </label>
                      <button
                        aria-label={`Remove ${service.name}`}
                        className="icon-button danger-icon-button"
                        onClick={() => removeServiceLine(index)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={18} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="customer-search-panel">
          <h2>
            <PackagePlus aria-hidden="true" size={20} strokeWidth={2.2} />
            Inventory Used
          </h2>
          <div className="inline-add-row">
            <select
              onChange={(event) => setSelectedInventoryId(event.target.value)}
              value={selectedInventoryId}
            >
              {inventoryItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {inventoryLabel(item)}
                </option>
              ))}
            </select>
            <button className="secondary-button" onClick={addInventory} type="button">
              <Plus aria-hidden="true" size={18} strokeWidth={2.3} />
              Add
            </button>
          </div>

          <div className="compact-result-list">
            {inventoryLines.map((line, index) => {
              const item = inventoryMap.get(line.id);

              if (!item) {
                return null;
              }

              return (
                <article className="customer-result-card" key={`${line.id}-${index}`}>
                  <div className="customer-result-header">
                    <div>
                      <h3>{item.name}</h3>
                      <p>
                        ${money(inventoryUnitPrice(item))} | Available {item.quantity}
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
                      <p>{inventoryLabel(item)}</p>
                    </div>
                    <div className="inline-qty-form">
                      <label>
                        Qty
                        <input
                          max={item.quantity}
                          min="1"
                          onChange={(event) =>
                            updateInventoryLine(index, Number(event.target.value))
                          }
                          step="1"
                          type="number"
                          value={line.quantity}
                        />
                      </label>
                      <button
                        aria-label={`Remove ${item.name}`}
                        className="icon-button danger-icon-button"
                        onClick={() => removeInventoryLine(index)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={18} strokeWidth={2.2} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      <div className="order-total-row">
        <span>Estimated Total</span>
        <strong>${money(estimatedTotal)}</strong>
      </div>

      <button
        className="submit-button compact-submit-button"
        disabled={
          (serviceLines.length === 0 && inventoryLines.length === 0) ||
          (isCompanyCar && !selectedCompany)
        }
        type="submit"
      >
        <span>Create Invoice</span>
        <span className="button-mark">&rarr;</span>
      </button>
    </form>
  );
}
