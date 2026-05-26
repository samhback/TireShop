"use client";

export function PrintButton() {
  return (
    <button className="secondary-button report-print-button" onClick={() => window.print()} type="button">
      Print Report
    </button>
  );
}
