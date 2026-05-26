"use client";

import { useState } from "react";
import { pricingMethodOptions } from "@/lib/serviceOptions";

type PricingFieldsProps = {
  defaultPricingMethod?: string;
  defaultFlatPrice?: string;
  defaultHourlyRate?: string;
};

export function PricingFields({
  defaultPricingMethod = "flat",
  defaultFlatPrice = "",
  defaultHourlyRate = "",
}: PricingFieldsProps) {
  const [pricingMethod, setPricingMethod] = useState(defaultPricingMethod);

  return (
    <>
      <div className="field">
        <label htmlFor="pricingMethod">Pricing Method</label>
        <select
          id="pricingMethod"
          name="pricingMethod"
          onChange={(event) => setPricingMethod(event.target.value)}
          required
          value={pricingMethod}
        >
          {pricingMethodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {pricingMethod === "flat" ? (
        <div className="field">
          <label htmlFor="flatPrice">Flat Price</label>
          <input
            defaultValue={defaultFlatPrice}
            id="flatPrice"
            min="0"
            name="flatPrice"
            placeholder="89.99"
            required
            step="0.01"
            type="number"
          />
        </div>
      ) : (
        <div className="field">
          <label htmlFor="hourlyRate">Hourly Rate</label>
          <input
            defaultValue={defaultHourlyRate}
            id="hourlyRate"
            min="0"
            name="hourlyRate"
            placeholder="125.00"
            required
            step="0.01"
            type="number"
          />
        </div>
      )}
    </>
  );
}
