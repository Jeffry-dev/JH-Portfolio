"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  value: string;
  label: string;
  className?: string;
}

/** Copies a value to the clipboard and announces the result to screen readers. */
export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

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

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={label}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-tint/[0.03] px-4 text-sm text-fg-muted transition-colors hover:border-tint/25 hover:text-fg",
          status === "copied" && "border-ok/40 text-ok hover:text-ok",
          className,
        )}
      >
        {status === "copied" ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Copy aria-hidden="true" className="size-4" />
        )}
        <span aria-hidden="true">{status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy"}</span>
      </button>
      <span role="status" className="sr-only">
        {status === "copied" ? "Email address copied to clipboard" : status === "failed" ? "Could not copy the email address" : ""}
      </span>
    </>
  );
}
