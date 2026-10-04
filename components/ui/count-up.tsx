"use client";

import { useEffect, useRef } from "react";
import { motionAllowed } from "@/lib/motion-prefs";
import { cn } from "@/lib/utils";

interface CountUpProps {
  /** The number to show. Rendered as is on the server, so the markup never differs on hydration. */
  value: number;
  /** Length of the count in ms. */
  duration?: number;
  /** Pause in ms between the reveal and the start of the count (0 is shown meanwhile). */
  delay?: number;
  className?: string;
}

/**
 * A number that counts up from 0 when it is revealed. The server renders the final value as
 * plain text (tabular numerals, so the width never jumps); on the client, when motion is
 * allowed, the count plays once the nearest `[data-reveal]` ancestor gains `.is-revealed`,
 * eased out over `duration`, and plays again whenever that ancestor is re-armed and revealed
 * again (the reveal replay after returning to the top of the page). A block revealed without an
 * entrance (`.reveal-settled`: scrolled up into, or reached by a jump) shows the final number at
 * once, like the rest of its content. Without a reveal ancestor it counts on mount.
 *
 * Assistive tech reads a static sr-only copy of the final value; the visible, counting copy is
 * aria-hidden (and not selectable), so a screen reader never announces an intermediate number.
 */
export function CountUp({ value, duration = 900, delay = 0, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionAllowed()) return;

    const final = String(value);
    let frame = 0;
    let wait = 0;

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(wait);
      frame = 0;
    };

    const play = () => {
      stop();
      el.textContent = "0";
      wait = window.setTimeout(() => {
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) ** 3;
          el.textContent = t < 1 ? String(Math.round(value * eased)) : final;
          frame = t < 1 ? requestAnimationFrame(tick) : 0;
        };
        frame = requestAnimationFrame(tick);
      }, delay);
    };

    const host = el.closest<HTMLElement>("[data-reveal]");
    if (!host) {
      play();
      return stop;
    }

    // Already revealed when this mounts (a late mount): the number is simply there.
    let revealed = host.classList.contains("is-revealed");

    const observer = new MutationObserver(() => {
      const now = host.classList.contains("is-revealed");
      if (now === revealed) return;
      revealed = now;
      if (!now) {
        stop();
        el.textContent = final;
      } else if (host.classList.contains("reveal-settled")) {
        el.textContent = final;
      } else {
        play();
      }
    });
    observer.observe(host, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      stop();
    };
  }, [value, duration, delay]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className={cn("tabular-nums select-none", className)}>
        {value}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
