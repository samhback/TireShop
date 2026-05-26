"use client";

import { useEffect } from "react";

const scrollKey = "hsc-order-scroll-y";

export function ScrollPreserver() {
  useEffect(() => {
    const savedScroll = window.sessionStorage.getItem(scrollKey);

    if (savedScroll) {
      window.sessionStorage.removeItem(scrollKey);
      window.requestAnimationFrame(() => {
        window.scrollTo(0, Number(savedScroll));
      });
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target;

      if (
        form instanceof HTMLFormElement &&
        form.dataset.preserveScroll === "true"
      ) {
        window.sessionStorage.setItem(scrollKey, String(window.scrollY));
      }
    }

    document.addEventListener("submit", handleSubmit, true);

    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  return null;
}
