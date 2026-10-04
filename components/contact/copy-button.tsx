"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  label: string;
  className?: string;
}

type CopyStatus = "idle" | "copied" | "failed";

const icons = { idle: Copy, copied: Check, failed: CircleAlert } as const;

/**
 * Copies a value to the clipboard and announces the result to screen readers.
 * Feedback matches the command palette's copy command: the tick and the "Copied" label pop in
 * (scale 50% and 90% to full, from transparent) and the pill turns green; a failure turns it red.
 * "Copy" and "Copied" share one grid cell, so the pill keeps its width. Press feedback is the
 * same on touch as with a mouse (active:scale).
 */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  };

  const Icon = icons[status];

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm",
          "transition-[background-color,border-color,color,scale] duration-150 ease-out-quart active:scale-[0.98]",
          status === "idle" &&
            "border-line-strong bg-tint/[0.03] text-fg-muted hover:border-tint/25 hover:bg-tint/[0.06] hover:text-fg focus-visible:border-tint/25 focus-visible:bg-tint/[0.06] focus-visible:text-fg active:border-tint/25 active:text-fg",
          status === "copied" && "border-ok/40 bg-ok/[0.06] text-ok",
          status === "failed" && "border-danger/40 bg-danger/[0.06] text-danger",
          className,
        )}
      >
        {/* Keyed so each state mounts fresh; the tick starts small and transparent (@starting-style). */}
        <Icon
          key={`icon-${status}`}
          aria-hidden="true"
          className={cn(
            "size-4",
            status === "copied" &&
              "transition-[opacity,scale] duration-[420ms] ease-out-expo starting:scale-50 starting:opacity-0",
          )}
        />
        {/* Keyed too: the result label pops in with the tick. Back to idle it just swaps. */}
        <span
          key={`label-${status}`}
          aria-hidden="true"
          className={cn(
            "grid justify-items-center",
            status !== "idle" && "transition-[opacity,scale] duration-300 ease-out-expo starting:scale-90 starting:opacity-0",
          )}
        >
          <span className={cn("col-start-1 row-start-1", status !== "idle" && "invisible")}>Copy</span>
          <span className={cn("col-start-1 row-start-1", status !== "copied" && "invisible")}>Copied</span>
          {status === "failed" ? <span className="col-start-1 row-start-1">Copy failed</span> : null}
        </span>
      </button>
      <span role="status" className="sr-only">
        {status === "copied" ? "Email address copied to clipboard" : status === "failed" ? "Could not copy the email address" : ""}
      </span>
    </>
  );
}
