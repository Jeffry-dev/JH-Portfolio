"use client";

import { useLayoutEffect, useRef } from "react";
import { Moon, Sun } from "lucide-react";
import { centerOf, toggleTheme, useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** How long the button keeps `data-switching` (the ring and icon animations run inside it). */
const SWITCH_MS = 700;

/**
 * Light / dark switch. The theme logic lives in lib/theme.ts (shared with the command palette).
 * Icons are switched by CSS from <html data-theme>, so they are right before hydration.
 * Hidden without JavaScript (the theme then follows the OS setting), and at least 44px on
 * touch screens whatever size the caller passes.
 *
 * Feedback on a switch, from here, the palette or the OS setting: the button pulses a ring and
 * the incoming icon turns into place (`.theme-toggle[data-switching]` in app/globals.css). The
 * attribute is set in a layout effect once the store reports the new theme, so it lands after
 * <html data-theme> has changed and before paint: only the icon now shown animates, and a tap
 * gets the same play as a click.
 */
export function ThemeToggle({ className = "size-10" }: { className?: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const theme = useTheme();
  const lastTheme = useRef<Theme | null>(null);
  const label = theme === null ? "Switch color theme" : theme === "dark" ? "Switch to light mode" : "Switch to dark mode";

  useLayoutEffect(() => {
    const button = buttonRef.current;
    const previous = lastTheme.current;
    lastTheme.current = theme;
    // The first client value (after hydration) is not a switch.
    if (!button || theme === null || previous === null || previous === theme) return;

    button.dataset.switching = "";
    const timer = window.setTimeout(() => {
      delete button.dataset.switching;
    }, SWITCH_MS);
    return () => window.clearTimeout(timer);
  }, [theme]);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={() => toggleTheme(centerOf(buttonRef.current))}
      aria-label={label}
      title={label}
      className={cn(
        "theme-toggle js-only group relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-line-strong bg-tint/[0.03] text-fg",
        "transition-[background-color,border-color,scale] duration-150 ease-out-quart active:scale-[0.98]",
        "hover:border-tint/25 hover:bg-tint/[0.07] focus-visible:border-tint/25 focus-visible:bg-tint/[0.07]",
        "pointer-coarse:min-h-11 pointer-coarse:min-w-11",
        className,
      )}
    >
      <Sun
        aria-hidden="true"
        className="toggle-sun size-[1.125rem] transition-transform duration-300 ease-out-expo group-hover:rotate-45 group-focus-visible:rotate-45 light:hidden"
      />
      <Moon
        aria-hidden="true"
        className="toggle-moon hidden size-[1.125rem] transition-transform duration-300 ease-out-expo group-hover:-rotate-12 group-focus-visible:-rotate-12 light:block"
      />
    </button>
  );
}
