"use client";

import { useEffect, useRef, type CSSProperties } from "react";

interface KineticNameProps {
  lines: string[];
  /** Base and peak variable-font weights for the cursor proximity effect. */
  baseWeight?: number;
  peakWeight?: number;
}

/**
 * The hero name, split into characters.
 * - On load, each line rises out of a clipping mask, one character after another (pure CSS).
 * - On desktop, characters near the cursor swell in weight using the variable display font.
 * The parent <h1> carries the accessible name; this markup is aria-hidden.
 */
export function KineticName({ lines, baseWeight = 600, peakWeight = 800 }: KineticNameProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const chars = Array.from(container.querySelectorAll<HTMLElement>("[data-char]"));
    const radius = 220;
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const paint = () => {
      frame = 0;
      for (const char of chars) {
        if (!pointer) {
          char.style.removeProperty("--wght");
          continue;
        }
        const rect = char.getBoundingClientRect();
        const dx = pointer.x - (rect.left + rect.width / 2);
        const dy = pointer.y - (rect.top + rect.height / 2);
        const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / radius);
        const eased = falloff * falloff * (3 - 2 * falloff); // smoothstep
        char.style.setProperty("--wght", String(Math.round(baseWeight + (peakWeight - baseWeight) * eased)));
      }
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    const onLeave = () => {
      pointer = null;
      schedule();
    };

    container.addEventListener("pointermove", onMove, { passive: true });
    container.addEventListener("pointerleave", onLeave);
    return () => {
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [baseWeight, peakWeight]);

  let charIndex = 0;

  return (
    <span ref={ref} aria-hidden="true" className="kinetic-name block">
      {lines.map((line, lineIndex) => (
        <span key={line} className="name-line">
          {Array.from(line).map((char, i) => {
            const style = { "--ci": charIndex++ } as CSSProperties;
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
