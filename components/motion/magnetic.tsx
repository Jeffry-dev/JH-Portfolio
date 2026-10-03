"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MagneticProps {
  children: ReactNode;
  /** How strongly the child follows the cursor (0–1). */
  strength?: number;
  /** Maximum travel in px. */
  max?: number;
  className?: string;
}

/**
 * Pulls its child slightly toward the cursor while hovered.
 * Desktop pointers only; disabled under reduced motion. Hit area never moves.
 */
export function Magnetic({ children, strength = 0.3, max = 10, className }: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

    const clamp = (value: number) => Math.max(-max, Math.min(max, value));

    const onMove = (event: PointerEvent) => {
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
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength, max]);

  return (
    <span ref={ref} className={cn("magnetic inline-flex", className)}>
      <span className="magnetic-inner inline-flex w-full">{children}</span>
    </span>
  );
}
