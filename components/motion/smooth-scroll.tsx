"use client";

import { useEffect } from "react";
import type Lenis from "lenis";
import { pointerEffectsAllowed } from "@/lib/motion-prefs";

/** Share of the remaining distance a glide covers per 60 Hz frame (Lenis scales it to the real frame time). */
const LERP = 0.1;
/** Longest step fed to a glide, so a late frame (a busy or background tab) resumes it instead of skipping to its end. */
const MAX_STEP_MS = 50;

/**
 * Smooth wheel scrolling for mouse and trackpad users (Lenis): each wheel step glides to its
 * target instead of jumping there, and quick steps merge into one continuous glide.
 *
 * - Only where pointerEffectsAllowed() (a fine hover pointer and motion allowed, see
 *   lib/motion-prefs.ts), checked again when reduced motion or the pointer changes. Phones and
 *   tablets keep the browser's touch scrolling, which already glides with momentum, and never
 *   download Lenis.
 * - It is still the page that scrolls: Lenis moves window.scrollY a little every frame, so scroll
 *   listeners, IntersectionObservers, CSS scroll timelines and sticky elements work unchanged.
 * - Everything except the wheel stays native: keyboard scrolling, the scrollbar, anchor jumps and
 *   scrollIntoView (with html's scroll-behavior and scroll-padding), and focus scrolling into
 *   view. Any key or mouse press ends a glide where it is, so those start from the current
 *   position instead of being pulled back by the rest of the glide.
 * - A wheel over a box that can scroll that way (the terminal output, a long message) scrolls the
 *   box as before, and the terminal keeps its overscroll containment (allowNestedScroll).
 * - While the page is scroll-locked (the mobile menu and the command palette hide <html>'s
 *   overflow), the wheel is left to the browser, so nothing moves behind them.
 * - Frames run only while a glide is in flight.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const rootStyle = getComputedStyle(document.documentElement);
    let lenis: Lenis | null = null;
    let disposed = false;
    let frame = 0;
    let lastFrame = 0;
    // The time handed to Lenis skips the idle gaps between glides, so a new glide starts from a
    // normal frame step. It starts above 0, which Lenis reads as "no previous frame".
    let clock = 1;

    const tick = (now: number) => {
      frame = 0;
      if (!lenis) return;
      clock += lastFrame ? Math.min(now - lastFrame, MAX_STEP_MS) : 0;
      lastFrame = now;
      lenis.raf(clock);
      if (lenis.isScrolling === "smooth") frame = requestAnimationFrame(tick);
      else lastFrame = 0;
    };

    /** A wheel step started or extended a glide: run frames until it lands. */
    const wake = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    /** Ends a glide where it is (stop and start reset Lenis to the current position). */
    const halt = () => {
      if (lenis?.isScrolling !== "smooth") return;
      lenis.stop();
      lenis.start();
    };

    const pageLocked = () => rootStyle.overflowY === "hidden" || rootStyle.overflowY === "clip";

    const enable = async () => {
      const { default: Scroller } = await import("lenis");
      if (disposed || lenis || !pointerEffectsAllowed()) return;
      lenis = new Scroller({
        lerp: LERP,
        allowNestedScroll: true,
        virtualScroll: () => !pageLocked(),
      });
      lenis.on("virtual-scroll", wake);
      window.addEventListener("pointerdown", halt, { capture: true, passive: true });
      window.addEventListener("keydown", halt, { capture: true, passive: true });
    };

    const disable = () => {
      if (!lenis) return;
      lenis.destroy();
      lenis = null;
      cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      window.removeEventListener("pointerdown", halt, { capture: true });
      window.removeEventListener("keydown", halt, { capture: true });
    };

    const update = () => {
      // If the module fails to load, scrolling simply stays native.
      if (pointerEffectsAllowed()) enable().catch(() => {});
      else disable();
    };

    update();
    reducedMotion.addEventListener("change", update);
    finePointer.addEventListener("change", update);
    return () => {
      disposed = true;
      reducedMotion.removeEventListener("change", update);
      finePointer.removeEventListener("change", update);
      disable();
    };
  }, []);

  return null;
}
