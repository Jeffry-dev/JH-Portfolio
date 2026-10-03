"use client";

import { Search } from "lucide-react";
import { openCommandPalette, paletteKeyShortcuts, useIsApplePlatform } from "@/lib/command-palette";
import { cn } from "@/lib/utils";

interface CommandTriggerProps {
  /** "desktop": search pill with the shortcut. "icon": 44px icon-only button for small screens. */
  variant?: "desktop" | "icon";
  className?: string;
}

/**
 * Opens the command palette (components/command/command-palette.tsx).
 * Both variants are named "Search", the word the desktop pill shows.
 */
export function CommandTrigger({ variant = "desktop", className }: CommandTriggerProps) {
  // "⌘K" / Meta+K on Apple devices, "Ctrl K" / Control+K elsewhere. The server renders the Ctrl variant.
  const apple = useIsApplePlatform();
  const keyShortcuts = paletteKeyShortcuts(apple);

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={openCommandPalette}
        aria-label="Search"
        aria-haspopup="dialog"
        aria-keyshortcuts={keyShortcuts}
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full border border-line-strong bg-tint/[0.03] text-fg transition-[background-color,border-color,transform] duration-200 hover:border-tint/25 hover:bg-tint/[0.07] active:scale-95",
          className,
        )}
      >
        <Search aria-hidden="true" className="size-[1.125rem]" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openCommandPalette}
      aria-haspopup="dialog"
      aria-keyshortcuts={keyShortcuts}
      className={cn(
        "group inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-line-strong bg-tint/[0.03] pr-1.5 pl-3.5 text-sm text-fg-muted transition-[background-color,border-color,color,transform] duration-200 hover:border-tint/25 hover:bg-tint/[0.06] hover:text-fg active:scale-[0.97]",
        className,
      )}
    >
      <Search
        aria-hidden="true"
        className="size-4 transition-transform duration-300 ease-out-expo group-hover:-rotate-12"
      />
      <span className="whitespace-nowrap">Search</span>
      {/* The shortcut is exposed through aria-keyshortcuts; the chip is visual only. */}
      <kbd
        aria-hidden="true"
        className="ml-1 inline-flex h-7 shrink-0 items-center rounded-full border border-line bg-tint/[0.04] px-2.5 font-mono whitespace-nowrap text-[0.6875rem] tracking-wide text-fg-muted transition-colors duration-200 group-hover:border-line-strong group-hover:text-fg"
      >
        {apple ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
