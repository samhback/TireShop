"use client";

export function PrintButton() {
  return (
    <button className="secondary-button quote-print-button" onClick={() => window.print()} type="button">
      Print Quote
    </button>
  );
}
