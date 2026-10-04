"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motionAllowed, pointerEffectsAllowed } from "@/lib/motion-prefs";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  /** How strongly the child follows the cursor (0 to 1). */
  strength?: number;
  /** Maximum travel in px. */
  max?: number;
  className?: string;
}

/**
 * Pulls its child slightly toward the cursor while hovered. Reserved for the hero's primary call
 * to action, so only one thing on the page moves this way; the hit area never moves.
 *
 * - Fine pointer (pointerEffectsAllowed): the inner element follows the cursor by up to `max` px.
 * - Touch or pen (motionAllowed, any device): a press bloom instead. `data-pressed` is set on
 *   pointerdown and removed on pointerup or pointercancel; styles/ambient.css scales the inner
 *   element to 0.97 and gives it a brief accent glow.
 */
export function Magnetic({ children, strength = 0.2, max = 6, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionAllowed()) return;

    const cleanups: Array<() => void> = [];

    if (pointerEffectsAllowed()) {
      const clamp = (value: number) => Math.max(-max, Math.min(max, value));

      const onMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const rect = el.getBoundingClientRect();
        const x = clamp((event.clientX - (rect.left + rect.width / 2)) * strength);
        const y = clamp((event.clientY - (rect.top + rect.height / 2)) * strength);
        el.style.setProperty("--mag-x", `${x}px`);
        el.style.setProperty("--mag-y", `${y}px`);
      };
      const onLeave = () => {
        el.style.setProperty("--mag-x", "0px");
        el.style.setProperty("--mag-y", "0px");
      };

      el.addEventListener("pointermove", onMove, { passive: true });
      el.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      });
    }

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      el.dataset.pressed = "";
    };
    const onRelease = () => {
      delete el.dataset.pressed;
    };

    el.addEventListener("pointerdown", onDown, { passive: true });
    el.addEventListener("pointerup", onRelease, { passive: true });
    el.addEventListener("pointercancel", onRelease, { passive: true });
    // A tap that turns into a scroll ends with pointercancel; a long press that leaves the
    // element ends with pointerleave. Both must release the bloom.
    el.addEventListener("pointerleave", onRelease, { passive: true });
    cleanups.push(() => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onRelease);
      el.removeEventListener("pointercancel", onRelease);
      el.removeEventListener("pointerleave", onRelease);
    });

    return () => cleanups.forEach((fn) => fn());
  }, [strength, max]);

  return (
    <span ref={ref} className={cn("magnetic inline-flex", className)}>
      <span className="magnetic-inner inline-flex w-full">{children}</span>
    </span>
  );
}
