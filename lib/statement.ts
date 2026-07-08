type Decimalish = { toString(): string } | number | null | undefined;

type LineItemLike = {
  lineType: string;
  lineTotal: Decimalish;
};

export function decimal(value: Decimalish) {
  return Number(value?.toString() ?? 0);
}

// Parts column groups inventory + custom fee lines (e.g. tire disposal); labor
// is service lines. Together with tax they add up to the invoice total.
export function invoiceParts(lineItems: LineItemLike[]) {
  return lineItems
    .filter((line) => line.lineType !== "service")
    .reduce((sum, line) => sum + decimal(line.lineTotal), 0);
}

export function invoiceLabor(lineItems: LineItemLike[]) {
  return lineItems
    .filter((line) => line.lineType === "service")
    .reduce((sum, line) => sum + decimal(line.lineTotal), 0);
}

export type AgingBucket = "current" | "d30" | "d60" | "d90";

export function agingBucket(invoiceDate: Date, statementDate: Date): AgingBucket {
  const days = Math.floor(
    (statementDate.getTime() - new Date(invoiceDate).getTime()) / 86400000,
  );

  if (days < 30) return "current";
  if (days < 60) return "d30";
  if (days < 90) return "d60";
  return "d90";
}
