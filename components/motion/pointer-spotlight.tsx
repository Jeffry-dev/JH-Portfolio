"use client";

import { useEffect } from "react";
import { motionAllowed, pointerEffectsAllowed } from "@/lib/motion-prefs";

/** How long a tapped card keeps `data-tap` (the CSS ripple and border glow run inside it). */
const TAP_MS = 650;

/**
 * One delegated listener set for every `.spotlight` card on the page (`[data-spotlight]`).
 *
 * - Fine pointer (pointerEffectsAllowed): pointermove writes the pointer position into
 *   --mx / --my so the CSS border highlight follows it around the card.
 * - Touch or pen (motionAllowed, any device): pointerdown writes the touch point into
 *   --mx / --my and sets `data-tap=""` on the card for 650 ms, then removes it. The CSS
 *   (spotlight utility in app/globals.css) uses that window for a border glow plus a short
 *   radial fill flash from the finger. Tapping again restarts the window.
 *
 * The touch path is not limited to touch-first devices: it only reacts to touch and pen
 * pointers, so a laptop with a touch screen gets the ripple too and a mouse never does.
 * Writes are rAF-throttled and listeners are passive.
 */
export function PointerSpotlight() {
  useEffect(() => {
    if (!motionAllowed()) return;

    const cleanups: Array<() => void> = [];

    if (pointerEffectsAllowed()) {
      let frame = 0;
      let lastEvent: PointerEvent | null = null;

      const update = () => {
        frame = 0;
        const event = lastEvent;
        if (!event || !(event.target instanceof Element)) return;
        const card = event.target.closest<HTMLElement>("[data-spotlight]");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        card.style.setProperty("--my", `${event.clientY - rect.top}px`);
      };

      const onMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        lastEvent = event;
        if (!frame) frame = requestAnimationFrame(update);
      };

      document.addEventListener("pointermove", onMove, { passive: true });
      cleanups.push(() => {
        document.removeEventListener("pointermove", onMove);
        if (frame) cancelAnimationFrame(frame);
      });
    }

    // Tap ripple, on release: a touch that becomes a scroll ends in pointercancel, never
    // pointerup, so scrolling across cards never flashes them. One pending timer per card, so a
    // quick second tap restarts the effect.
    const timers = new WeakMap<HTMLElement, number>();

    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      if (!(event.target instanceof Element)) return;
      const card = event.target.closest<HTMLElement>("[data-spotlight]");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);

      const pending = timers.get(card);
      if (pending) {
        window.clearTimeout(pending);
        // Drop the attribute, flush style so the removal is seen, then re-add it: the CSS
        // animation restarts (layout is already fresh from getBoundingClientRect above).
        delete card.dataset.tap;
        void card.offsetWidth;
      }
      card.dataset.tap = "";
      timers.set(
        card,
        window.setTimeout(() => {
          delete card.dataset.tap;
          timers.delete(card);
        }, TAP_MS),
      );
    };

    document.addEventListener("pointerup", onUp, { passive: true });
    cleanups.push(() => document.removeEventListener("pointerup", onUp));

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return null;
}
