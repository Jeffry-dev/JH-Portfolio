"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { isTouchDevice, motionAllowed, pointerEffectsAllowed } from "@/lib/motion-prefs";

interface KineticNameProps {
  lines: string[];
  /** Base and peak variable-font weights for the cursor proximity effect. */
  baseWeight?: number;
  peakWeight?: number;
}

/** Entrance stagger (shared hero timing): the first character starts at 60ms, then one every 28ms. */
const FIRST_CHAR_DELAY_MS = 60;
const CHAR_STAGGER_MS = 28;
/** Length of one character's entrance (char-rise in app/globals.css). */
const CHAR_RISE_MS = 700;
/** Distance in px at which the cursor stops affecting a character. */
const RADIUS = 180;
/** Weight wave: characters start 35ms apart, counted from the one the wave begins at. */
const WAVE_STAGGER_MS = 35;
/** The wave is dropped this long after its last character was due to start, whatever happens. */
const WAVE_SETTLE_MS = 1400;
/** Keyframe names in app/globals.css. */
const ENTRANCE_ANIMATION = "char-rise";
const WAVE_ANIMATION = "name-wave";

/**
 * The hero name, split into characters.
 * - On load, each line rises out of a clipping mask, one character after another (pure CSS).
 * - Once the last character has landed, a weight wave sweeps the name left to right once:
 *   `data-wave` on the root plays the `name-wave` keyframes on every character, each delayed by
 *   its own --wave-delay (see .kinetic-name[data-wave] in app/globals.css). The entrance keeps
 *   its place in the animation list, so it never replays; its delay is each character's
 *   inline --char-delay, which the stylesheet reads in both states.
 * - With a desktop pointer (pointerEffectsAllowed), characters near the cursor swell slightly
 *   in weight using the variable display font. Character centers are measured once and
 *   cached until the layout may have moved, so a frame only writes styles.
 * - On touch screens (isTouchDevice), tapping the name replays the wave outward from the
 *   tapped character. Nothing here runs under reduced motion (motionAllowed).
 * The parent <h1> carries the accessible name; this markup is aria-hidden.
 */
export function KineticName({ lines, baseWeight = 600, peakWeight = 700 }: KineticNameProps) {
  const ref = useRef<HTMLSpanElement>(null);

  // Weight wave: once after the entrance, and from the tapped character on touch screens.
  useEffect(() => {
    const container = ref.current;
    if (!container || !motionAllowed()) return;

    const chars = Array.from(container.querySelectorAll<HTMLElement>("[data-char]"));
    if (chars.length === 0) return;
    const lastChar = chars[chars.length - 1];
    let started = false;
    let ended = 0;
    let entranceTimer = 0;
    let settleTimer = 0;

    const stop = () => {
      window.clearTimeout(settleTimer);
      delete container.dataset.wave;
    };

    const wave = (origin: number) => {
      let maxDelay = 0;
      chars.forEach((char, i) => {
        const delay = Math.abs(i - origin) * WAVE_STAGGER_MS;
        maxDelay = Math.max(maxDelay, delay);
        char.style.setProperty("--wave-delay", `${delay}ms`);
      });
      ended = 0;
      // Remove, force a style flush, add: a wave already running starts over from the new origin.
      delete container.dataset.wave;
      container.getBoundingClientRect();
      container.dataset.wave = "";
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(stop, maxDelay + WAVE_SETTLE_MS);
    };

    const onEntranceDone = () => {
      if (started) return;
      started = true;
      window.clearTimeout(entranceTimer);
      wave(0);
    };

    const onAnimationEnd = (event: AnimationEvent) => {
      if (event.animationName === ENTRANCE_ANIMATION && event.target === lastChar) onEntranceDone();
      if (event.animationName === WAVE_ANIMATION && container.dataset.wave !== undefined) {
        ended += 1;
        if (ended >= chars.length) stop();
      }
    };

    // The character nearest a point, for taps that land between or beside the letters.
    const nearestChar = (x: number, y: number) => {
      let best = 0;
      let bestDistance = Infinity;
      chars.forEach((char, i) => {
        const rect = char.getBoundingClientRect();
        const distance = Math.hypot(rect.left + rect.width / 2 - x, rect.top + rect.height / 2 - y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      return best;
    };

    const onTap = (event: MouseEvent) => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return; // a long press that selected text
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-char]") : null;
      const index = target ? chars.indexOf(target) : -1;
      started = true;
      wave(index >= 0 ? index : nearestChar(event.clientX, event.clientY));
    };

    container.addEventListener("animationend", onAnimationEnd);
    const touch = isTouchDevice();
    if (touch) container.addEventListener("click", onTap);

    // If hydration came after the entrance (slow devices), its animationend is gone: start now.
    // Otherwise a timer backs up the event, in case it never fires.
    const entranceRunning =
      typeof CSSAnimation !== "undefined" &&
      container
        .getAnimations({ subtree: true })
        .some(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.animationName === ENTRANCE_ANIMATION &&
            animation.playState !== "finished",
        );
    entranceTimer = window.setTimeout(
      onEntranceDone,
      entranceRunning ? FIRST_CHAR_DELAY_MS + chars.length * CHAR_STAGGER_MS + CHAR_RISE_MS + 80 : 0,
    );

    return () => {
      container.removeEventListener("animationend", onAnimationEnd);
      if (touch) container.removeEventListener("click", onTap);
      window.clearTimeout(entranceTimer);
      stop();
    };
  }, []);

  // Desktop pointer: characters near the cursor gain weight.
  useEffect(() => {
    const container = ref.current;
    if (!container || !pointerEffectsAllowed()) return;

    const chars = Array.from(container.querySelectorAll<HTMLElement>("[data-char]"));
    const applied = chars.map(() => baseWeight);
    let centers: { x: number; y: number }[] = [];
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    // One read pass for every character, reused until scroll, resize or an animation moves them.
    const measure = () => {
      centers = chars.map((char) => {
        const rect = char.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      });
    };
    const invalidate = () => {
      centers = [];
    };

    const paint = () => {
      frame = 0;
      if (pointer && centers.length === 0) measure();
      chars.forEach((char, i) => {
        let weight = baseWeight;
        if (pointer) {
          const { x, y } = centers[i];
          const falloff = Math.max(0, 1 - Math.hypot(pointer.x - x, pointer.y - y) / RADIUS);
          const eased = falloff * falloff * (3 - 2 * falloff); // smoothstep
          weight = Math.round(baseWeight + (peakWeight - baseWeight) * eased);
        }
        if (weight === applied[i]) return;
        applied[i] = weight;
        if (weight === baseWeight) char.style.removeProperty("--wght");
        else char.style.setProperty("--wght", String(weight));
      });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onEnter = () => invalidate();
    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const onLeave = () => {
      pointer = null;
      schedule();
    };

    container.addEventListener("pointerenter", onEnter);
    container.addEventListener("pointermove", onMove, { passive: true });
    container.addEventListener("pointerleave", onLeave);
    // Each character's entrance (and the weight wave) ends with it in a new place.
    container.addEventListener("animationend", invalidate);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate, { passive: true });
    return () => {
      container.removeEventListener("pointerenter", onEnter);
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      container.removeEventListener("animationend", invalidate);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [baseWeight, peakWeight]);

  let charIndex = 0;

  return (
    <span ref={ref} aria-hidden="true" className="kinetic-name block">
      {lines.map((line, lineIndex) => (
        <span key={line} className="name-line">
          {Array.from(line).map((char, i) => {
            // The entrance delay; the wave's own delay (--wave-delay) is written when the wave runs.
            const style = { "--char-delay": `${FIRST_CHAR_DELAY_MS + charIndex++ * CHAR_STAGGER_MS}ms` } as CSSProperties;
            return (
              <span key={`${char}-${i}`} data-char className="name-char" style={style}>
                {char}
              </span>
            );
          })}
          {/* Keeps textContent readable ("Jeffry Harfouche") for crawlers and copy/paste. */}
          {lineIndex < lines.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
