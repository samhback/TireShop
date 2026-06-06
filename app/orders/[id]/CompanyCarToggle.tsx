"use client";

import { useState, useTransition } from "react";
import { updateOrderCompanyCar } from "@/app/actions";

type CompanyCarToggleProps = {
  canApply: boolean;
  companyId: number | null;
  companyName: string;
  disabled: boolean;
  isCompanyCar: boolean;
  orderId: number;
};

export function CompanyCarToggle({
  canApply,
  companyId,
  companyName,
  disabled,
  isCompanyCar,
  orderId,
}: CompanyCarToggleProps) {
  const [checked, setChecked] = useState(isCompanyCar);
  const [isPending, startTransition] = useTransition();
  const isDisabled = disabled || !canApply || isPending;

  function handleChange(nextChecked: boolean) {
    setChecked(nextChecked);

    const formData = new FormData();
    formData.set("orderId", String(orderId));
    formData.set("companyId", companyId?.toString() ?? "");
    formData.set("redirectOnSave", "false");

    if (nextChecked) {
      formData.set("isCompanyCar", "on");
    }

    startTransition(async () => {
      try {
        await updateOrderCompanyCar(formData);
      } catch {
        setChecked(!nextChecked);
      }
    });
  }

  return (
    <label className="checkbox-line company-car-toggle">
      <input
        checked={checked}
        disabled={isDisabled}
        name="isCompanyCar"
        onChange={(event) => handleChange(event.target.checked)}
        type="checkbox"
      />
      <span className="company-car-label">
        <span>Company Car</span>
        <span className="company-car-company">
          {isPending ? "Saving..." : companyName}
        </span>
      </span>
    </label>
  );
}
