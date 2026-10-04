"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/** Speed of both rows of the technology band, in px per second. */
const SPEED_PX_PER_S = 24;

/**
 * Pause/play control for the technology band (WCAG 2.2.2: moving content must be stoppable).
 * Also pauses the band while it is off-screen or the tab is hidden, to save work, and sets each
 * row's duration from the width of one copy so both rows move at the same speed whatever their
 * length or the current font size (re-measured when the type size changes).
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

    // The band starts below the hero, so the first calibration happens out of sight.
    const tracks = Array.from(band.querySelectorAll<HTMLElement>(".marquee-track"));
    const calibrate = () => {
      for (const track of tracks) {
        const width = track.querySelector<HTMLElement>(".marquee-copy")?.offsetWidth ?? 0;
        if (width > 0) track.style.setProperty("--marquee-duration", `${(width / SPEED_PX_PER_S).toFixed(1)}s`);
      }
    };
    const resize = new ResizeObserver(calibrate);
    tracks.forEach((track) => resize.observe(track));

    return () => {
      observer.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => setPaused((value) => !value)}
      className="js-only marquee-toggle inline-flex h-11 items-center gap-1.5 rounded-full border border-line-strong bg-bg/80 px-4 font-mono text-xs text-fg-muted transition-[border-color,color,scale] duration-150 ease-out-quart hover:border-tint/25 hover:text-fg focus-visible:border-tint/25 focus-visible:text-fg active:scale-[0.98]"
    >
      {paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
      <span>{paused ? "Play" : "Pause"}</span>
      <span className="sr-only"> scrolling technologies</span>
    </button>
  );
}
