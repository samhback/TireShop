"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useRef } from "react";

type FieldSnapshot = {
  checked?: boolean;
  value: string;
};

const warningMessage =
  "Are you sure you want to go home? You haven't saved your changes.";

function isTrackableField(
  field: Element,
): field is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  if (
    !(
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    )
  ) {
    return false;
  }

  if (field.disabled) {
    return false;
  }

  if (field instanceof HTMLInputElement) {
    return !["button", "hidden", "reset", "submit"].includes(field.type);
  }

  return true;
}

function snapshotField(
  field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): FieldSnapshot {
  return {
    checked: field instanceof HTMLInputElement ? field.checked : undefined,
    value: field.value,
  };
}

export function UnsavedHomeLink() {
  const initialFields = useRef(new WeakMap<Element, FieldSnapshot>());

  useEffect(() => {
    const fields = document.querySelectorAll("[data-unsaved-guard] input, [data-unsaved-guard] select, [data-unsaved-guard] textarea");

    fields.forEach((field) => {
      if (isTrackableField(field)) {
        initialFields.current.set(field, snapshotField(field));
      }
    });
  }, []);

  function hasUnsavedChanges() {
    const fields = document.querySelectorAll("[data-unsaved-guard] input, [data-unsaved-guard] select, [data-unsaved-guard] textarea");

    return Array.from(fields).some((field) => {
      if (!isTrackableField(field)) {
        return false;
      }

      const initialValue =
        initialFields.current.get(field) ?? snapshotField(field);

      if (
        field instanceof HTMLInputElement &&
        ["checkbox", "radio"].includes(field.type)
      ) {
        return field.checked !== initialValue.checked;
      }

      return field.value !== initialValue.value;
    });
  }

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!hasUnsavedChanges()) {
      return;
    }

    if (!window.confirm(warningMessage)) {
      event.preventDefault();
    }
  }

  return (
    <Link className="home-link" href="/employee-home" onClick={handleClick}>
      Home
    </Link>
  );
}
