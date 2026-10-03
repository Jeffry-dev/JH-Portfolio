"use client";

import { useSyncExternalStore } from "react";

/**
 * Tiny event contract between the command palette and anything that opens it
 * (navbar buttons, keyboard shortcut). Keeps the palette decoupled from the navbar.
 */
export const OPEN_COMMAND_PALETTE_EVENT = "command-palette:open";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}

/* ------------------------------------------------------------------
   Platform: Apple devices use Cmd+K, everything else Ctrl+K. Only one of the two is
   claimed, so Ctrl+K keeps its system meaning on macOS (delete to the end of the line).
   ------------------------------------------------------------------ */

let applePlatform: boolean | undefined;

/** Client only. True on macOS, iOS and iPadOS (which reports itself as a Mac). */
export function isApplePlatform(): boolean {
  if (applePlatform === undefined) {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent;
    applePlatform = /mac|iphone|ipad|ipod/i.test(platform);
  }
  return applePlatform;
}

/** The platform never changes during a visit, so there is nothing to subscribe to. */
const subscribe = () => () => {};

/**
 * `isApplePlatform()` for rendering. The server and the hydration pass use `false`
 * (the Ctrl+K variant), then Apple devices re-render, so there is no hydration mismatch.
 */
export function useIsApplePlatform(): boolean {
  return useSyncExternalStore(subscribe, isApplePlatform, () => false);
}

/** The palette shortcut as an aria-keyshortcuts value. */
export function paletteKeyShortcuts(apple: boolean): string {
  return apple ? "Meta+K" : "Control+K";
}
