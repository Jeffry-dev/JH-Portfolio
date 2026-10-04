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
   Platform: Apple devices advertise Cmd+K, everything else Ctrl+K.
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

/** The palette shortcut as an aria-keyshortcuts value (the advertised one; see isPaletteShortcut). */
export function paletteKeyShortcuts(apple: boolean): string {
  return apple ? "Meta+K" : "Control+K";
}

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea, select"));
}

/**
 * Cmd+K on Apple devices, Ctrl+K elsewhere, including keyboard layouts where the K key types
 * another letter. Apple devices also accept Ctrl+K outside text fields, for visitors with a PC
 * habit; inside a field Ctrl+K keeps its system meaning there (delete to the end of the line).
 */
export function isPaletteShortcut(event: KeyboardEvent): boolean {
  const cmd = event.metaKey && !event.ctrlKey;
  const ctrl = event.ctrlKey && !event.metaKey;
  const modifier = isApplePlatform() ? cmd || (ctrl && !isEditable(event.target)) : ctrl;
  if (!modifier || event.altKey || event.shiftKey || event.isComposing) return false;
  if (typeof event.key !== "string") return false;
  const key = event.key.toLowerCase();
  if (key === "k") return true;
  // Non-Latin layouts (e.g. Arabic) report a different character for the same physical key.
  return !/^[a-z]$/.test(key) && event.code === "KeyK";
}
