"use client";

import { useState } from "react";
import { FaCheck, FaShareAlt, FaTimes } from "react-icons/fa";

// Opens the platform share sheet where there is one (Android, iOS, some
// desktop) and falls back to the clipboard everywhere else. navigator.share
// must be called directly from the click — an await before it loses the
// user-gesture and the sheet won't open.
//
// Icon-only and fixed width so the "copied" feedback doesn't shift the row.
// Stops propagation because it sits inside clickable cards and headers.
export function Share({
  listId,
  name,
  className = "btn btn-primary btn-sm",
}: {
  listId: string;
  name?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/dashboard/lists/${listId}`;
    const title = name ? `"${name}" on Lists` : "Lists";

    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (err) {
        // the user dismissed the sheet — not a failure
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 1800);
  };

  const label =
    state === "copied"
      ? "Link copied"
      : state === "failed"
        ? "Copy failed"
        : "Share list link";

  return (
    <button
      type="button"
      className={`${className} w-9 px-0 justify-center`}
      onClick={handleShare}
      onKeyDown={(e) => e.stopPropagation()}
      title={label}
      aria-label={label}
    >
      {state === "copied" ? (
        <FaCheck />
      ) : state === "failed" ? (
        <FaTimes />
      ) : (
        <FaShareAlt />
      )}
    </button>
  );
}
