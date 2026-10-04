"use client";

import { useEffect } from "react";

const REVEALED = "is-revealed";
/** Transitions off for two frames: the element appears in its final state, no entrance. */
const INSTANT = "reveal-instant";
/** Stays until the element is re-armed: reveal-only animations (e.g. DNA wires) don't replay. */
const SETTLED = "reveal-settled";
/** Scrolled to within this share of a viewport from the top of the page counts as back at the top. */
const TOP_ZONE = 0.25;

/**
 * Drives every `[data-reveal]` element on the page; CSS handles the motion.
 *
 * - Scrolling down: elements animate in as they enter the viewport.
 * - Scrolling up: content is already there. Anything entering from the top, or skipped by a
 *   jump (command palette, link, fast scroll, restored scroll position), appears instantly,
 *   so re-reading is never slowed down. Keyboard focus moving into a hidden element shows it
 *   instantly too, so a focused control is never transparent.
 * - Back at the top of the page, everything below the viewport is re-armed, so the next pass
 *   down plays the entrances again, like a fresh load. Scrolling back up mid-page never
 *   re-arms anything. With prefers-reduced-motion, elements stay revealed once shown.
 *
 * A nested reveal can ask to enter together with its parent: `data-reveal-with="<media query>"`
 * reveals it at the same moment as its nearest `[data-reveal]` ancestor whenever the query
 * matches (the Technical DNA columns on desktop, where the hub wires draw to them), and on its
 * own otherwise. At the very end of the page, anything still pending and on screen is revealed
 * too, because the bottom 10% band can never be crossed there (a short footer on a tall screen).
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

    /** Elements still waiting for their entrance. Only these are observed and measured. */
    const pending = new Set(elements);

    // Entering the lower 90% of the viewport: animate, unless it comes in from the top
    // (the visitor is scrolling up into it, or landed inside it), which shows it instantly.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const viewportTop = entry.rootBounds?.top ?? 0;
          reveal(entry.target as HTMLElement, entry.boundingClientRect.top < viewportTop - 1);
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.01 },
    );

    const reveal = (el: HTMLElement, instantly: boolean) => {
      if (!pending.delete(el)) return;
      observer.unobserve(el);
      if (!instantly) {
        el.classList.add(REVEALED);
        revealWith(el, false);
        return;
      }
      el.classList.add(INSTANT, SETTLED, REVEALED);
      // Drop the transition override once the final state has been painted.
      nextFrame(() => nextFrame(() => el.classList.remove(INSTANT)));
      revealWith(el, true);
    };

    /** Nested reveals that enter together with `parent` where their media query matches. */
    const revealWith = (parent: HTMLElement, instantly: boolean) => {
      for (const child of parent.querySelectorAll<HTMLElement>("[data-reveal][data-reveal-with]")) {
        if (child.parentElement?.closest("[data-reveal]") !== parent) continue;
        const query = child.dataset.revealWith;
        if (query && window.matchMedia(query).matches) reveal(child, instantly);
      }
    };

    const rearm = (el: HTMLElement) => {
      el.classList.remove(REVEALED, SETTLED, INSTANT);
      pending.add(el);
      observer.observe(el);
    };

    elements.forEach((el) => observer.observe(el));

    // Jumps can carry an element from below the screen to above it without it ever
    // intersecting, which IntersectionObserver never reports. Arriving back at the top of the
    // page re-arms what lies below the viewport (never what is on screen). One cheap pass per
    // scrolled frame covers both; it only measures pending elements, except on that arrival.
    let atTop = window.scrollY <= window.innerHeight * TOP_ZONE;
    const sweep = () => {
      const height = window.innerHeight;
      const atEnd = window.scrollY + height >= root.scrollHeight - 2;
      for (const el of pending) {
        const rect = el.getBoundingClientRect();
        if (rect.bottom <= 0) reveal(el, true); // skipped while scrolling down
        else if (atEnd && rect.top < height) reveal(el, false); // end of page: the -10% band can't be crossed
      }

      const nowAtTop = window.scrollY <= height * TOP_ZONE;
      if (nowAtTop && !atTop && !reducedMotion.matches) {
        for (const el of elements) {
          if (!pending.has(el) && el.getBoundingClientRect().top >= height) rearm(el);
        }
      }
      atTop = nowAtTop;
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

    // Focus inside a hidden element (and any hidden reveal around it) shows it at once.
    const onFocusIn = (event: FocusEvent) => {
      let el = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-reveal]") : null;
      while (el) {
        reveal(el, true);
        el = el.parentElement?.closest<HTMLElement>("[data-reveal]") ?? null;
      }
    };

    sweep();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    document.addEventListener("focusin", onFocusIn);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("focusin", onFocusIn);
      frames.forEach((id) => cancelAnimationFrame(id));
    };
  }, []);

  return null;
}
