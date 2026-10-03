"use client";

import { useEffect } from "react";

const REVEALED = "is-revealed";
/** Transitions off for two frames: the element appears in its final state, no entrance. */
const INSTANT = "reveal-instant";
/** Stays until the element is re-armed: reveal-only animations (e.g. DNA wires) don't replay. */
const SETTLED = "reveal-settled";
/** How far below the viewport (in viewport heights) an element must be before it is re-armed. */
const REARM_DISTANCE = 0.25;

/**
 * Drives every `[data-reveal]` element on the page; CSS handles the motion.
 *
 * - Scrolling down: elements animate in as they enter the viewport.
 * - Scrolling up: content is already there. Anything entering from the top, or skipped by a
 *   jump (command palette, link, fast scroll, restored scroll position), appears instantly,
 *   so re-reading is never slowed down.
 * - Once an element is well below the viewport again (the visitor scrolled back up past it),
 *   it is re-armed, so the next pass down plays its entrance again, like a fresh load.
 *   With prefers-reduced-motion, elements stay revealed once shown.
 *
 * Elements are only hidden while `<html>` has the `js` class (set by an inline script before
 * first paint). If this component never mounts, the script's timeout adds `reveal-fallback`
 * and everything is shown. Content never depends on JavaScript.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.revealReady = "true";

    const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!("IntersectionObserver" in window)) {
      elements.forEach((el) => el.classList.add(REVEALED));
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const frames = new Set<number>();
    const nextFrame = (callback: () => void) => {
      const id = requestAnimationFrame(() => {
        frames.delete(id);
        callback();
      });
      frames.add(id);
    };

    const revealInstantly = (el: HTMLElement) => {
      if (el.classList.contains(REVEALED)) return;
      el.classList.add(INSTANT, SETTLED, REVEALED);
      // Drop the transition override once the final state has been painted.
      nextFrame(() => nextFrame(() => el.classList.remove(INSTANT)));
    };

    // Entering the lower 90% of the viewport: animate, unless it comes in from the top
    // (the visitor is scrolling up into it, or landed inside it), which shows it instantly.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          const viewportTop = entry.rootBounds?.top ?? 0;
          if (entry.boundingClientRect.top < viewportTop - 1) revealInstantly(el);
          else el.classList.add(REVEALED);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );
    elements.forEach((el) => observer.observe(el));

    // Jumps can carry an element from below the screen to above it (or back) without it ever
    // intersecting, which IntersectionObserver never reports. One cheap pass per scrolled frame
    // covers both cases.
    const sweep = () => {
      const height = window.innerHeight;
      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        const revealed = el.classList.contains(REVEALED);
        if (!revealed && rect.bottom <= 0) {
          revealInstantly(el); // skipped while scrolling down: show it without an entrance
        } else if (revealed && rect.top >= height * (1 + REARM_DISTANCE) && !reducedMotion.matches) {
          el.classList.remove(REVEALED, SETTLED, INSTANT); // well below: play it again next time
        }
      }
    };

    let scheduled = false;
    const onScroll = () => {
      if (scheduled) return;
      scheduled = true;
      nextFrame(() => {
        scheduled = false;
        sweep();
      });
    };

    sweep();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      frames.forEach((id) => cancelAnimationFrame(id));
    };
  }, []);

  return null;
}
