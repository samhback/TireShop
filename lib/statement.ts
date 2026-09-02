import { prisma } from "@/lib/prisma";

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

// An invoice is stamped with a companyInvoiceId when it lands on a statement and
// is never picked up again, so an unpaid one silently drops off later paperwork.
// Past due is therefore derived at read time: every still-unpaid company-car
// invoice for this company that predates the statement being viewed, excluding
// the ones this statement already bills. Invoices sitting on no statement at all
// are picked up too, since they are owed just the same.
//
// Note this reflects payment status *now*, not a frozen snapshot: reprinting an
// old statement shows what is still outstanding today, which is what a
// collections document wants.
export async function fetchPastDueInvoices(
  companyId: number,
  statement: { id: number; statementDate: Date },
) {
  return prisma.invoice.findMany({
    where: {
      status: "unpaid",
      companyInvoiceId: {
        not: statement.id,
      },
      createdAt: {
        lte: statement.statementDate,
      },
      order: {
        companyId,
        isCompanyCar: true,
      },
    },
    select: {
      id: true,
      invoiceNumber: true,
      createdAt: true,
      total: true,
      companyInvoice: {
        select: {
          id: true,
          statementDate: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export type PastDueInvoice = Awaited<
  ReturnType<typeof fetchPastDueInvoices>
>[number];

export function pastDueTotal(invoices: PastDueInvoice[]) {
  return invoices.reduce((sum, invoice) => sum + decimal(invoice.total), 0);
}

// Group past due under the statement each invoice originally came from, so the
// customer can reconcile it against paperwork they already have. Invoices on no
// statement are collected under a null key.
export function groupPastDueByStatement(invoices: PastDueInvoice[]) {
  const groups = new Map<
    number | null,
    { statementId: number | null; statementDate: Date | null; invoices: PastDueInvoice[] }
  >();

  for (const invoice of invoices) {
    const key = invoice.companyInvoice?.id ?? null;
    const group = groups.get(key);

    if (group) {
      group.invoices.push(invoice);
    } else {
      groups.set(key, {
        statementId: key,
        statementDate: invoice.companyInvoice?.statementDate ?? null,
        invoices: [invoice],
      });
    }
  }

  return [...groups.values()].sort((a, b) => {
    const aTime = a.statementDate?.getTime() ?? 0;
    const bTime = b.statementDate?.getTime() ?? 0;
    return aTime - bTime;
  });
}
