"use client";

import { useState } from "react";

type CompanyMarkupFieldsProps = {
  defaultEnabled?: boolean;
  defaultMarkupPercent?: string;
};

export function CompanyMarkupFields({
  defaultEnabled = false,
  defaultMarkupPercent = "0",
}: CompanyMarkupFieldsProps) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <>
      <label className="company-markup-toggle">
        <input
          checked={enabled}
          name="useCompanyMarkup"
          onChange={(event) => setEnabled(event.target.checked)}
          type="checkbox"
        />
        <span>Use Company Markup</span>
      </label>

      <div className="field">
        <label htmlFor="markupPercent">Inventory Markup %</label>
        <input
          defaultValue={defaultMarkupPercent}
          disabled={!enabled}
          id="markupPercent"
          min="0"
          name="markupPercent"
          required={enabled}
          step="0.01"
          type="number"
        />
      </div>
    </>
  );
}
