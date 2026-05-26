"use client";

import { useTransition } from "react";
import { updateOrderQuotedBy } from "@/app/actions";

type QuotedBySelectProps = {
  employees: {
    id: number;
    name: string;
  }[];
  orderId: number;
  quotedByEmployeeId: number | null;
};

export function QuotedBySelect({
  employees,
  orderId,
  quotedByEmployeeId,
}: QuotedBySelectProps) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string) {
    const formData = new FormData();
    formData.set("orderId", String(orderId));
    formData.set("quotedByEmployeeId", value);

    startTransition(async () => {
      await updateOrderQuotedBy(formData);
    });
  }

  return (
    <div className="field quoted-by-auto-field">
      <label htmlFor="quotedByEmployeeId">Quoted By</label>
      <select
        defaultValue={quotedByEmployeeId?.toString() ?? ""}
        disabled={isPending}
        id="quotedByEmployeeId"
        name="quotedByEmployeeId"
        onChange={(event) => handleChange(event.target.value)}
      >
        <option value="">
          {employees.length > 0 ? "Select employee" : "Add employees first"}
        </option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id.toString()}>
            {employee.name}
          </option>
        ))}
      </select>
      {isPending ? <span>Saving...</span> : null}
    </div>
  );
}
