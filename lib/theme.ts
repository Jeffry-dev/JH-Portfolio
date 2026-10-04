"use client";

import { useSyncExternalStore } from "react";

/**
 * Theme store shared by the navbar toggle and the command palette.
 * The initial theme is applied before first paint by the boot script in app/layout.tsx
 * (saved choice, otherwise the OS setting); this module handles changes afterwards.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Points the browser UI color (e.g. the Android toolbar) at the current page background. Both
 * theme-color metas get it, because their media queries follow the OS, not a saved choice.
 */
function syncThemeColor() {
  const background = getComputedStyle(document.documentElement).getPropertyValue("--color-bg").trim();
  if (!background) return;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((meta) => {
    meta.content = background;
  });
}

/** Applies a theme to <html>, keeps the browser UI color in sync and notifies subscribers. */
function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  syncThemeColor();
  listeners.forEach((listener) => listener());
}

let themeColorSynced = false;

/**
 * Fallback for browsers without the View Transitions API: <html> carries this class while the
 * theme changes, and styles/navbar.css transitions every colour over 250 ms. Removed a little
 * later than that, so no transition is cut short.
 */
const FADE_CLASS = "theme-fade";
const FADE_MS = 300;
let fadeTimer: number | undefined;

function applyThemeWithFade(theme: Theme) {
  const root = document.documentElement;
  window.clearTimeout(fadeTimer);
  root.classList.add(FADE_CLASS);
  applyTheme(theme);
  fadeTimer = window.setTimeout(() => root.classList.remove(FADE_CLASS), FADE_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Runs after hydration, so React has already placed the metas. The boot script may have applied
  // a saved theme that differs from the OS setting the metas were chosen by.
  if (!themeColorSynced) {
    themeColorSynced = true;
    syncThemeColor();
  }
  // Follow the OS setting until the visitor picks a theme themselves.
  const system = window.matchMedia("(prefers-color-scheme: light)");
  const onSystemChange = () => {
    if (!savedTheme()) applyTheme(system.matches ? "light" : "dark");
  };
  system.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    system.removeEventListener("change", onSystemChange);
  };
}

/** Current theme for React components; `null` during server render and hydration. */
export function useTheme(): Theme | null {
  return useSyncExternalStore<Theme | null>(subscribe, getTheme, () => null);
}

/**
 * Switches theme and remembers the choice. Where the View Transitions API is available,
 * the new theme is revealed by a circle growing from `origin` (e.g. the clicked button);
 * elsewhere the colours cross-fade over 250 ms; with reduced motion it switches instantly.
 */
export function setTheme(next: Theme, origin?: { x: number; y: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable (private mode); the switch still works for this visit.
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyTheme(next);
    return;
  }
  if (typeof document.startViewTransition !== "function") {
    applyThemeWithFade(next);
    return;
  }

  const x = origin?.x ?? window.innerWidth / 2;
  const y = origin?.y ?? window.innerHeight / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));

  const transition = document.startViewTransition(() => applyTheme(next));
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.16, 1, 0.3, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {
      // The transition was skipped; the theme has already been applied.
    });
}

export function toggleTheme(origin?: { x: number; y: number }) {
  setTheme(getTheme() === "dark" ? "light" : "dark", origin);
}

/** Center of an element, for use as a theme-switch origin. */
export function centerOf(element: Element | null | undefined) {
  if (!element) return undefined;
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}
