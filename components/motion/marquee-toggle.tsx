"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Pause/play control for the technology band (WCAG 2.2.2: moving content must be stoppable).
 * Also pauses the band while it is off-screen or the tab is hidden, to save work.
 * State is written as data attributes on the closest `[data-marquee]`; CSS does the rest.
 */
export function MarqueeToggle() {
  const ref = useRef<HTMLButtonElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const band = ref.current?.closest<HTMLElement>("[data-marquee]");
    if (!band) return;
    band.dataset.paused = String(paused);
  }, [paused]);

  useEffect(() => {
    const band = ref.current?.closest<HTMLElement>("[data-marquee]");
    if (!band) return;

    const observer = new IntersectionObserver(([entry]) => {
      band.dataset.offscreen = String(!entry.isIntersecting);
    });
    observer.observe(band);

    const onVisibility = () => {
      band.dataset.hidden = String(document.hidden);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setPaused((value) => !value)}
      className="marquee-toggle inline-flex h-11 items-center gap-1.5 rounded-full border border-line-strong bg-bg/80 px-4 font-mono text-[0.6875rem] text-fg-muted transition-[border-color,color,transform] duration-200 hover:border-tint/25 hover:text-fg active:scale-[0.97]"
    >
      {paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
      <span>{paused ? "Play" : "Pause"}</span>
      <span className="sr-only"> scrolling technologies</span>
    </button>
  );
}
