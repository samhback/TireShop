"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type QuoteLinkProps = {
  canGenerate: boolean;
  orderId: number;
};

function quoteGeneratedKey(orderId: number) {
  return `hsc-order-${orderId}-quote-generated`;
}

export function QuoteLink({ canGenerate, orderId }: QuoteLinkProps) {
  const [hasGeneratedQuote, setHasGeneratedQuote] = useState(false);

  useEffect(() => {
    setHasGeneratedQuote(
      window.localStorage.getItem(quoteGeneratedKey(orderId)) === "true",
    );
  }, [orderId]);

  function handleClick() {
    if (!canGenerate) {
      return;
    }

    window.localStorage.setItem(quoteGeneratedKey(orderId), "true");
    setHasGeneratedQuote(true);
  }

  if (!canGenerate) {
    return (
      <span className="protected-label">
        Select Quoted By before generating quote.
      </span>
    );
  }

  return (
    <Link
      className="secondary-link-button"
      href={`/orders/${orderId}/quote`}
      onClick={handleClick}
      target="_blank"
    >
      {hasGeneratedQuote ? "Re-Generate Quote" : "Generate Quote"}
    </Link>
  );
}
