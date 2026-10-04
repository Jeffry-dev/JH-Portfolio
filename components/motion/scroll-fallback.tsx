"use client";

import { useEffect } from "react";

/** Added to <html> when the browser runs CSS scroll-driven animations natively. */
const SUPPORTED = "scroll-timelines";

/**
 * Scroll-driven motion for browsers without CSS scroll timelines (older iOS Safari, Firefox).
 *
 * Contract shared with every stylesheet that uses `animation-timeline`:
 * - When `CSS.supports("animation-timeline: scroll()")` is true, <html> carries the class
 *   `scroll-timelines` (set by the inline boot script in app/layout.tsx before first paint, and
 *   again here) and this component does nothing else. The CSS timeline version applies.
 * - Otherwise, on scroll and resize (one measurement per frame, passive listeners), it writes
 *   on <html>:
 *     --scroll-progress   0..1, how far the page is scrolled (0 on a page that cannot scroll);
 *     --scroll-y          window.scrollY clamped to 0..innerHeight, as a px value;
 *   and on every `[data-view-progress]` element:
 *     --view-progress     0..1 for the element travelling from entering at the bottom edge of
 *                         the viewport to leaving at the top edge:
 *                         clamp((innerHeight - rect.top) / (innerHeight + rect.height), 0, 1).
 *   Stylesheets pair each `@supports (animation-timeline: scroll())` rule with an
 *   `html:not(.scroll-timelines)` rule that maps these variables to the same visual result.
 *
 * Elements are collected on mount, once more a frame later (other components render them),
 * and again on resize. Positions are measured once per collection or resize and cached as
 * document offsets, so a scroll frame reads only scrollY and writes variables: no layout reads
 * inside the loop. A ResizeObserver on <body> re-measures when content changes height
 * (an expanded inspector, a loaded font).
 *
 * Reduced motion: the values are still written. The fallback CSS decides what to do with them
 * (usually a static final state), exactly as the timeline version does.
 */
export function ScrollFallback() {
  useEffect(() => {
    const root = document.documentElement;
    const supported =
      typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("animation-timeline: scroll()");
    if (supported) {
      root.classList.add(SUPPORTED);
      return;
    }
    root.classList.remove(SUPPORTED);

    interface Tracked {
      el: HTMLElement;
      /** Distance from the top of the document to the top of the element. */
      top: number;
      height: number;
    }

    let tracked: Tracked[] = [];
    let viewportHeight = window.innerHeight;
    let maxScroll = 0;
    let frame = 0;
    let measureFrame = 0;

    const write = () => {
      frame = 0;
      const y = window.scrollY;
      const progress = maxScroll > 0 ? Math.min(1, Math.max(0, y / maxScroll)) : 0;
      root.style.setProperty("--scroll-progress", progress.toFixed(4));
      const yInView = Math.min(viewportHeight, Math.max(0, y));
      root.style.setProperty("--scroll-y", `${yInView.toFixed(1)}px`);
      for (const item of tracked) {
        const top = item.top - y;
        const value = (viewportHeight - top) / (viewportHeight + item.height);
        item.el.style.setProperty("--view-progress", Math.min(1, Math.max(0, value)).toFixed(4));
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    /** Re-reads every cached position (one layout pass), then writes the current values. */
    const measure = () => {
      measureFrame = 0;
      viewportHeight = window.innerHeight;
      maxScroll = Math.max(0, root.scrollHeight - viewportHeight);
      const y = window.scrollY;
      for (const item of tracked) {
        const rect = item.el.getBoundingClientRect();
        item.top = rect.top + y;
        item.height = rect.height;
      }
      write();
    };

    const scheduleMeasure = () => {
      if (!measureFrame) measureFrame = requestAnimationFrame(measure);
    };

    const collect = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-view-progress]"));
      tracked = elements.map((el) => ({ el, top: 0, height: 0 }));
      scheduleMeasure();
    };

    collect();
    // Other components may add [data-view-progress] elements after this effect runs.
    const recollect = requestAnimationFrame(collect);

    const resize = new ResizeObserver(scheduleMeasure);
    resize.observe(document.body);

    const onResize = () => collect();

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("load", scheduleMeasure);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("load", scheduleMeasure);
      resize.disconnect();
      cancelAnimationFrame(recollect);
      if (frame) cancelAnimationFrame(frame);
      if (measureFrame) cancelAnimationFrame(measureFrame);
    };
  }, []);

  return null;
}
