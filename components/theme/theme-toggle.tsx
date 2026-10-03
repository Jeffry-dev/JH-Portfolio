"use client";

import { useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { centerOf, toggleTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * Light / dark switch. The theme logic lives in lib/theme.ts (shared with the command palette).
 * Icons are switched by CSS from <html data-theme>, so they are right before hydration.
 */
export function ThemeToggle({ className = "size-10" }: { className?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const theme = useTheme();
  const label = theme === null ? "Switch color theme" : theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => toggleTheme(centerOf(buttonRef.current))}
      aria-label={label}
      title={label}
      className={cn(
        "group relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-tint/[0.03] text-fg transition-[background-color,border-color,transform] duration-200 hover:border-tint/25 hover:bg-tint/[0.07] active:scale-95",
        className,
      )}
    >
      <Sun
        aria-hidden="true"
        className="size-[1.125rem] transition-transform duration-500 ease-out-expo group-hover:rotate-45 light:hidden"
      />
      <Moon
        aria-hidden="true"
        className="hidden size-[1.125rem] transition-transform duration-500 ease-out-expo group-hover:-rotate-12 light:block"
      />
    </button>
  );
}
