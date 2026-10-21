"use client";

import { useSyncExternalStore } from "react";
import { FaMoon, FaSun } from "react-icons/fa";

// The pre-paint script in app/layout.tsx has already set data-theme (saved
// choice, else OS preference). The attribute is the source of truth: this
// subscribes to it rather than copying it into state, so the icon can never
// disagree with the page.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const getMode = () =>
  document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";

export function ThemeToggle({
  className = "btn btn-ghost btn-sm btn-square",
}: {
  className?: string;
}) {
  const mode = useSyncExternalStore(subscribe, getMode, () => "light");

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // private browsing / storage disabled — theme just won't persist
    }
  };

  const label = mode === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      type="button"
      onClick={toggle}
      className={className}
      title={label}
      aria-label={label}
    >
      {mode === "dark" ? <FaSun /> : <FaMoon />}
    </button>
  );
}
