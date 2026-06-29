// Combined state + local sales tax rate for Healdton, Oklahoma (9.375%).
// Stored and applied as a decimal multiplier (0.09375 == 9.375%).
export const DEFAULT_SALES_TAX_RATE = 0.09375;

export const REGULAR_TIRE_DISPOSAL_DESCRIPTION = "Regular Tire Disposal";
export const SEMI_TIRE_DISPOSAL_DESCRIPTION = "Semi Tire Disposal";

export function getSalesTaxRate() {
  const raw = process.env.SALES_TAX_RATE;

  if (raw === undefined || raw.trim() === "") {
    return DEFAULT_SALES_TAX_RATE;
  }

  const parsed = Number(raw);

  return Number.isNaN(parsed) || parsed < 0 ? DEFAULT_SALES_TAX_RATE : parsed;
}

// 0.09375 -> "9.375" for display next to the tax amount.
export function formatTaxRatePercent(rate: number | { toString(): string }) {
  const value = Number(rate.toString()) * 100;
  return Number(value.toFixed(3)).toString();
}

export function isTireDisposalLine(description: string) {
  return (
    description === REGULAR_TIRE_DISPOSAL_DESCRIPTION ||
    description === SEMI_TIRE_DISPOSAL_DESCRIPTION
  );
}

// Mirrors the taxability rule applied when an order is turned into an invoice,
// so a quote's tax matches the final invoice. Tire disposal fees are exempt;
// everything else follows the item's own taxable flag (defaulting to taxable).
export function lineItemTaxable(line: {
  lineType: string;
  description: string;
  serviceItem?: { taxable: boolean } | null;
  inventoryItem?: { taxable: boolean } | null;
}) {
  if (line.lineType === "inventory") {
    return line.inventoryItem?.taxable ?? true;
  }

  if (line.lineType === "service") {
    return line.serviceItem?.taxable ?? true;
  }

  return !isTireDisposalLine(line.description);
}
