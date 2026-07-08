import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getEmployeeSession } from "@/lib/session";
import { InvoiceDocument } from "./InvoiceDocument";
import { PrintButton } from "./PrintButton";

type InvoicePrintPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoicePrintPage({ params }: InvoicePrintPageProps) {
  const employee = await getEmployeeSession();

  if (!employee) {
    redirect("/");
  }

  const { id } = await params;
  const invoiceId = Number(id);

  if (!Number.isInteger(invoiceId)) {
    notFound();
  }

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    include: {
      customer: true,
      vehicle: true,
      order: {
        include: {
          quotedByEmployee: true,
        },
      },
      lineItems: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  return (
    <main className="quote-print-shell">
      <div className="quote-screen-actions">
        <PrintButton />
      </div>

      <InvoiceDocument invoice={invoice} />
    </main>
  );
}
