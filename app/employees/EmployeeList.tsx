"use client";

import { Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { searchEmployeeProfiles } from "@/app/actions";

type EmployeeResult = Awaited<ReturnType<typeof searchEmployeeProfiles>>[number];

type EmployeeListProps = {
  employees: EmployeeResult[];
};

export function EmployeeList({ employees }: EmployeeListProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployeeResult[]>(employees);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (query.trim().length < 2) {
        setResults(employees);
        return;
      }

      startTransition(async () => {
        const nextResults = await searchEmployeeProfiles(query);
        setResults(nextResults);
      });
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [employees, query]);

  if (employees.length === 0) {
    return (
      <div className="empty-state">
        <UserPlus size={28} strokeWidth={2.2} />
        <h2>No employees yet</h2>
        <p>Add the first employee contact record.</p>
        <Link className="secondary-link-button" href="/employees/add">
          Add Employee
        </Link>
      </div>
    );
  }

  return (
    <div className="inventory-search">
      <div className="search-box">
        <Search aria-hidden="true" size={22} strokeWidth={2.2} />
        <input
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search employees..."
          value={query}
        />
      </div>

      <div className="search-status">
        {query.trim().length < 2
          ? `Showing first ${employees.length} employee${
              employees.length === 1 ? "" : "s"
            }. Search to find more.`
          : isPending
            ? "Searching..."
            : `${results.length} result${results.length === 1 ? "" : "s"}`}
      </div>

      {results.length > 0 ? (
        <div className="search-results">
          {results.map((employee) => (
            <article className="search-result-card" key={employee.id}>
              <div>
                <span className="role-label">Employee</span>
                <h2>{employee.name}</h2>
                <p>{[employee.phone, employee.email].filter(Boolean).join(" | ") || "No contact details"}</p>
                <Link
                  className="secondary-link-button inline-action-link"
                  href={`/employees/${employee.id}/edit`}
                >
                  Edit
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No matching employees</h2>
          <p>Try searching by name, phone, or email.</p>
        </div>
      )}
    </div>
  );
}
