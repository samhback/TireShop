"use client";

import { useTransition } from "react";
import { updateOrderLineItemPerformedBy } from "@/app/actions";

type PerformedBySelectProps = {
  employees: {
    id: number;
    name: string;
  }[];
  lineItemId: number;
  orderId: number;
  performedByEmployeeId: number | null;
};

export function PerformedBySelect({
  employees,
  lineItemId,
  orderId,
  performedByEmployeeId,
}: PerformedBySelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const formData = new FormData();
    formData.set("orderId", String(orderId));
    formData.set("lineItemId", String(lineItemId));
    formData.set("performedByEmployeeId", value);

    startTransition(async () => {
      await updateOrderLineItemPerformedBy(formData);
    });
  }

  return (
    <label className="performed-by-field">
      Performed By
      <select
        defaultValue={performedByEmployeeId?.toString() ?? ""}
        disabled={isPending}
        onChange={(event) => handleChange(event.target.value)}
      >
        <option value="">Select employee</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id.toString()}>
            {employee.name}
          </option>
        ))}
      </select>
      {isPending ? <span>Saving...</span> : null}
    </label>
  );
}
