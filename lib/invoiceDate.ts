type DatedInvoice = { invoiceDate: Date | null; createdAt: Date };

const shopTimeZone = "America/Chicago";

export function parseInvoiceDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? date
    : null;
}

export function invoiceDateInputValue(invoice: DatedInvoice): string {
  if (invoice.invoiceDate) return invoice.invoiceDate.toISOString().slice(0, 10);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: shopTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(invoice.createdAt);
  const part = (type: string) => parts.find((item) => item.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function formatInvoiceDate(
  invoice: DatedInvoice,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" },
): string {
  const date = parseInvoiceDate(invoiceDateInputValue(invoice));
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(date!);
}
