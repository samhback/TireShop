"use client";

import { useFormStatus } from "react-dom";

// Disabled while the push runs so a double click can't create two QBO invoices.
export function QuickBooksSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="secondary-button" disabled={pending} type="submit">
      {pending ? "Sending to QuickBooks..." : label}
    </button>
  );
}
