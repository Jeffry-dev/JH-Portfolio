"use client";

import { useEffect, useRef } from "react";
import { isTouchDevice, motionAllowed, pointerEffectsAllowed } from "@/lib/motion-prefs";

/** Share of the remaining distance the light covers per 60 Hz frame (scaled to the real frame time). */
const FOLLOW = 0.16;
/** Faster glide between two taps on touch screens, where the light has no path to trace. */
const FOLLOW_TOUCH = 0.3;
const FRAME_MS = 1000 / 60;
/** How long the light stays lit after a tap before it starts to fade (CSS fades it over 900 ms). */
const TOUCH_LINGER_MS = 1200;
const TOUCH_FADE_MS = 900;

/**
 * Cursor-aware ambient layer.
 *
 * Desktop (pointerEffectsAllowed): a faint light follows the pointer with easing, and the
 * blueprint grid becomes slightly more visible right around it (aligned to the page grid).
 * It fades out when the pointer leaves the window.
 *
 * Touch devices (isTouchDevice and motionAllowed): the same light, smaller and softer
 * (styles/ambient.css), appears at the point of every tap, lingers for about 1.2 s and fades
 * out over 0.9 s. A tap while it is still lit glides it to the new point. The grid tile shows
 * at the tap point as well.
 *
 * Both are small, GPU-friendly layers that move with transforms; nothing renders on a canvas.
 * Off with prefers-reduced-motion, Save-Data and on low-memory devices (lib/motion-prefs.ts).
 */
export function AmbientCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer || !motionAllowed()) return;
    const touch = isTouchDevice();
    if (!touch && !pointerEffectsAllowed()) return;

    const follow = touch ? FOLLOW_TOUCH : FOLLOW;
    let targetX = window.innerWidth * 0.7;
    let targetY = window.innerHeight * 0.3;
    let x = targetX;
    let y = targetY;
    let frame = 0;
    let lastTime = 0;

    const render = (now: number) => {
      // Ease toward the pointer so the light trails slightly instead of snapping. The step is
      // scaled to the frame time, so the trail feels the same at 60 Hz and 120 Hz.
      const elapsed = lastTime ? Math.min(64, now - lastTime) : FRAME_MS;
      lastTime = now;
      const step = 1 - Math.pow(1 - follow, elapsed / FRAME_MS);
      x += (targetX - x) * step;
      y += (targetY - y) * step;
      layer.style.setProperty("--ax", `${x.toFixed(1)}px`);
      layer.style.setProperty("--ay", `${y.toFixed(1)}px`);
      // Offset of the grid window inside the 72px page grid, so the tile stays aligned.
      layer.style.setProperty("--gx", `${(((x - 220) % 72) + 72) % 72}px`);
      layer.style.setProperty("--gy", `${(((y - 220) % 72) + 72) % 72}px`);
      if (Math.abs(targetX - x) > 0.3 || Math.abs(targetY - y) > 0.3) {
        frame = requestAnimationFrame(render);
      } else {
        frame = 0;
        lastTime = 0;
      }
    };

    if (touch) {
      let hideTimer = 0;
      /** Until when the light is visible (lit, or still fading out). */
      let litUntil = 0;

      // On release: a touch that becomes a scroll ends in pointercancel, never pointerup, so the
      // light answers taps and never blooms under a scrolling finger.
      const onUp = (event: PointerEvent) => {
        if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
        targetX = event.clientX;
        targetY = event.clientY;
        const now = performance.now();
        if (now >= litUntil) {
          // Fully faded: appear at the finger instead of gliding in from the last tap.
          x = targetX;
          y = targetY;
        }
        litUntil = now + TOUCH_LINGER_MS + TOUCH_FADE_MS;
        layer.dataset.active = "true";
        window.clearTimeout(hideTimer);
        hideTimer = window.setTimeout(() => {
          delete layer.dataset.active;
        }, TOUCH_LINGER_MS);
        if (!frame) frame = requestAnimationFrame(render);
      };

      window.addEventListener("pointerup", onUp, { passive: true });
      return () => {
        window.removeEventListener("pointerup", onUp);
        window.clearTimeout(hideTimer);
        if (frame) cancelAnimationFrame(frame);
      };
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
      targetX = event.clientX;
      targetY = event.clientY;
      layer.dataset.active = "true";
      if (!frame) frame = requestAnimationFrame(render);
    };
    const onLeave = () => {
      delete layer.dataset.active;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="ambient-cursor">
      <div className="ambient-light" />
      <div className="ambient-grid">
        <div className="ambient-grid-tile" />
      </div>
    </div>
  );
}
