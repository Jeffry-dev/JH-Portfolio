"use client";

import { useEffect, useRef } from "react";

/**
 * Cursor-aware ambient layer (desktop only).
 * A faint light follows the pointer with easing, and the blueprint grid becomes slightly more
 * visible right around it (aligned to the page grid). Both are small, GPU-friendly layers that
 * move with transforms; nothing renders on a canvas.
 *
 * Disabled for touch/coarse pointers, prefers-reduced-motion, Save-Data and low-memory devices.
 */
export function AmbientCursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const lowPower = nav.connection?.saveData === true || (nav.deviceMemory !== undefined && nav.deviceMemory < 4);
    if (!finePointer.matches || reducedMotion.matches || lowPower) return;

    let targetX = window.innerWidth * 0.7;
    let targetY = window.innerHeight * 0.3;
    let x = targetX;
    let y = targetY;
    let frame = 0;

    const render = () => {
      // Ease toward the pointer so the light trails slightly instead of snapping.
      x += (targetX - x) * 0.18;
      y += (targetY - y) * 0.18;
      layer.style.setProperty("--ax", `${x.toFixed(1)}px`);
      layer.style.setProperty("--ay", `${y.toFixed(1)}px`);
      // Offset of the grid window inside the 72px page grid, so the tile stays aligned.
      layer.style.setProperty("--gx", `${(((x - 220) % 72) + 72) % 72}px`);
      layer.style.setProperty("--gy", `${(((y - 220) % 72) + 72) % 72}px`);
      if (Math.abs(targetX - x) > 0.3 || Math.abs(targetY - y) > 0.3) {
        frame = requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

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
