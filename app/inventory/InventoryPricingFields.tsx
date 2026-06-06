"use client";

import { useMemo, useState } from "react";

type InventoryPricingFieldsProps = {
  defaultCost?: string;
  defaultSellPrice?: string;
};

function calculateMarkedUpPrice(cost: string, markupPercent: string) {
  const costValue = Number(cost);
  const markupValue = Number(markupPercent);

  if (
    Number.isNaN(costValue) ||
    costValue < 0 ||
    Number.isNaN(markupValue) ||
    markupValue < 0
  ) {
    return "";
  }

  return (costValue * (1 + markupValue / 100)).toFixed(2);
}

export function InventoryPricingFields({
  defaultCost = "",
  defaultSellPrice = "",
}: InventoryPricingFieldsProps) {
  const [cost, setCost] = useState(defaultCost);
  const [pricingMode, setPricingMode] = useState<"sale" | "markup">("sale");
  const [sellPrice, setSellPrice] = useState(defaultSellPrice);
  const [markupPercent, setMarkupPercent] = useState("");
  const markedUpPrice = useMemo(
    () => calculateMarkedUpPrice(cost, markupPercent),
    [cost, markupPercent],
  );
  const currentSellPrice = pricingMode === "markup" ? markedUpPrice : sellPrice;

  return (
    <>
      <div className="field">
        <label htmlFor="cost">Cost Each</label>
        <input
          id="cost"
          min="0"
          name="cost"
          onChange={(event) => setCost(event.target.value)}
          step="0.01"
          type="number"
          value={cost}
          required
        />
      </div>

      <input name="pricingMode" type="hidden" value={pricingMode} />

      <div className="field">
        <label htmlFor="pricingModeSale">Price Entry</label>
        <div className="option-row">
          <label>
            <input
              checked={pricingMode === "sale"}
              id="pricingModeSale"
              onChange={() => setPricingMode("sale")}
              type="radio"
            />
            Sale Price
          </label>
          <label>
            <input
              checked={pricingMode === "markup"}
              onChange={() => setPricingMode("markup")}
              type="radio"
            />
            Markup %
          </label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="sellPrice">Sell Price Each</label>
        <input
          id="sellPrice"
          min="0"
          name="sellPrice"
          onChange={(event) => setSellPrice(event.target.value)}
          readOnly={pricingMode === "markup"}
          step="0.01"
          type="number"
          value={currentSellPrice}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="markupPercent">Markup Percent</label>
        <input
          disabled={pricingMode !== "markup"}
          id="markupPercent"
          min="0"
          name="markupPercent"
          onChange={(event) => setMarkupPercent(event.target.value)}
          step="0.01"
          type="number"
          value={markupPercent}
          required={pricingMode === "markup"}
        />
      </div>
    </>
  );
}
