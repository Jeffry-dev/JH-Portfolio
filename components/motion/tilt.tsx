"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { isTouchDevice, motionAllowed, pointerEffectsAllowed } from "@/lib/motion-prefs";
import { cn } from "@/lib/utils";

interface TiltProps {
  children: ReactNode;
  /** Maximum rotation in degrees on each axis. Kept small: the terminal is a working input. */
  max?: number;
  className?: string;
}

/** Degrees the phone must turn (from where it was first held) to reach the full tilt. */
const ORIENTATION_RANGE_DEG = 10;
/** Share of the remaining distance covered per 60 Hz frame while following the sensor. */
const ORIENTATION_FOLLOW = 0.12;
/** The resting angle drifts toward the current reading, so the card recentres over a few seconds. */
const ORIENTATION_RECENTRE = 0.01;
/** Without a reading within this time the sensor is treated as unavailable (desktop browsers, disabled sensors). */
const ORIENTATION_TIMEOUT_MS = 1500;
const FRAME_MS = 1000 / 60;

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * Subtle 3D tilt with a soft glare, for a single focal element (the hero terminal).
 *
 * - Fine pointer (pointerEffectsAllowed): tilts toward the cursor; the glare follows it.
 * - Touch device with a readable orientation sensor (Android: DeviceOrientationEvent exists and
 *   needs no permission prompt): tilts with the phone. The angle the phone is first held at is
 *   flat; turning it up to 10 degrees either way reaches the full tilt, smoothed frame by frame,
 *   and the resting angle slowly follows the phone so the card recentres when the visitor
 *   settles into a new posture. The glare sits where the light would catch it. Portrait only:
 *   in landscape the card eases flat (the sensor's angles belong to the portrait frame).
 * - Touch device without a sensor, or where reading it would prompt (iOS): no prompt. Instead a
 *   gentle idle float (`data-idle`, styles/ambient.css): the card lifts 4px and tips 0.6deg over
 *   2.4 s, twice (under five seconds in all), with the glare softly visible, then rests.
 *
 * While focus is inside it (the visitor is typing or following a link), it settles flat and
 * ignores the pointer or sensor until focus leaves; the idle float pauses. Off-screen, sensor
 * reading and the idle float stop. Off with reduced motion (lib/motion-prefs.ts).
 */
export function Tilt({ children, max = 3, className }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !motionAllowed()) return;

    // Back to flat; the CSS transition eases it there and fades the glare.
    const settle = () => {
      delete el.dataset.tilting;
      el.style.setProperty("--tilt-x", "0deg");
      el.style.setProperty("--tilt-y", "0deg");
    };

    if (pointerEffectsAllowed()) {
      let frame = 0;
      let last: PointerEvent | null = null;
      let paused = el.contains(document.activeElement);

      const paint = () => {
        frame = 0;
        if (!last || paused) return;
        const rect = el.getBoundingClientRect();
        const px = (last.clientX - rect.left) / rect.width; // 0..1
        const py = (last.clientY - rect.top) / rect.height;
        el.style.setProperty("--tilt-x", `${((0.5 - py) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty("--tilt-y", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
        el.style.setProperty("--glare-x", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--glare-y", `${(py * 100).toFixed(1)}%`);
      };

      const onLeave = () => {
        last = null;
        settle();
      };
      const onMove = (event: PointerEvent) => {
        if (paused || event.pointerType === "touch") return;
        last = event;
        el.dataset.tilting = "true";
        if (!frame) frame = requestAnimationFrame(paint);
      };
      const onFocusIn = () => {
        paused = true;
        onLeave();
      };
      const onFocusOut = (event: FocusEvent) => {
        if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return;
        paused = false;
      };

      el.addEventListener("pointermove", onMove, { passive: true });
      el.addEventListener("pointerleave", onLeave);
      el.addEventListener("focusin", onFocusIn);
      el.addEventListener("focusout", onFocusOut);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
        el.removeEventListener("focusin", onFocusIn);
        el.removeEventListener("focusout", onFocusOut);
        if (frame) cancelAnimationFrame(frame);
      };
    }

    if (!isTouchDevice()) return;

    /* Touch devices: an IntersectionObserver gates both the sensor and the idle float. */
    const cleanups: Array<() => void> = [];
    let onScreen = false;
    let onVisible: (() => void) | null = null;
    let onHidden: (() => void) | null = null;

    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      el.dataset.offscreen = String(!onScreen);
      if (onScreen) onVisible?.();
      else onHidden?.();
    });
    observer.observe(el);
    cleanups.push(() => observer.disconnect());

    const startIdle = () => {
      el.dataset.idle = "";
      const onEnd = (event: AnimationEvent) => {
        if (event.target !== el.firstElementChild) return;
        delete el.dataset.idle;
      };
      el.addEventListener("animationend", onEnd);
      cleanups.push(() => el.removeEventListener("animationend", onEnd));
    };

    const Orientation = (window as Window & { DeviceOrientationEvent?: OrientationEventConstructor })
      .DeviceOrientationEvent;
    const sensorReadable = typeof Orientation === "function" && typeof Orientation.requestPermission !== "function";

    if (!sensorReadable) {
      startIdle();
      return () => cleanups.forEach((fn) => fn());
    }

    /* Orientation path. */
    let frame = 0;
    let lastTime = 0;
    let listening = false;
    let paused = el.contains(document.activeElement);
    let gotReading = false;
    /** The next reading becomes the new rest angle (first reading, and after every pause). */
    let rebase = true;
    /** Set once the sensor produced nothing and the idle float took over; the sensor is not retried. */
    let gaveUp = false;
    let fallbackTimer = 0;
    // Sensor readings and the slowly drifting rest angle (degrees).
    let beta = 0;
    let gamma = 0;
    let restBeta = 0;
    let restGamma = 0;
    // Current smoothed tilt (degrees).
    let tiltX = 0;
    let tiltY = 0;
    // Last written values, so sensor jitter below the resolution writes nothing (the glare is a
    // gradient, and every write repaints it).
    const written: Record<string, string> = {};

    const clamp = (value: number) => Math.max(-max, Math.min(max, value));
    const set = (name: string, value: string) => {
      if (written[name] === value) return;
      written[name] = value;
      el.style.setProperty(name, value);
    };

    const render = (now: number) => {
      frame = 0;
      if (!listening || paused) return;
      const elapsed = lastTime ? Math.min(64, now - lastTime) : FRAME_MS;
      lastTime = now;
      const frames = elapsed / FRAME_MS;
      const step = 1 - Math.pow(1 - ORIENTATION_FOLLOW, frames);
      const drift = 1 - Math.pow(1 - ORIENTATION_RECENTRE, frames);
      restBeta += (beta - restBeta) * drift;
      restGamma += (gamma - restGamma) * drift;
      // Tipping the top of the phone away (beta up) tips the top of the card away too.
      const targetX = clamp((-(beta - restBeta) / ORIENTATION_RANGE_DEG) * max);
      const targetY = clamp(((gamma - restGamma) / ORIENTATION_RANGE_DEG) * max);
      tiltX += (targetX - tiltX) * step;
      tiltY += (targetY - tiltY) * step;
      set("--tilt-x", `${tiltX.toFixed(2)}deg`);
      set("--tilt-y", `${tiltY.toFixed(2)}deg`);
      // The glare drifts opposite to the tilt, like a light source that stays put (1% steps).
      set("--glare-x", `${Math.round(50 - (tiltY / max) * 40)}%`);
      set("--glare-y", `${Math.round(20 + (tiltX / max) * 30)}%`);
      const moving = Math.abs(targetX - tiltX) > 0.01 || Math.abs(targetY - tiltY) > 0.01;
      const unsettled = Math.abs(beta - restBeta) > 0.05 || Math.abs(gamma - restGamma) > 0.05;
      if (moving || unsettled) {
        frame = requestAnimationFrame(render);
      } else {
        lastTime = 0;
      }
    };

    /** Portrait only: in landscape the device-frame angles map to the wrong screen axes. */
    const landscape = () => (screen.orientation?.angle ?? 0) % 180 !== 0;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      if (!gotReading) {
        gotReading = true;
        window.clearTimeout(fallbackTimer);
        el.dataset.tilting = "true";
      }
      if (landscape()) {
        // Ease to flat and stay there; the first portrait reading takes a fresh rest angle.
        rebase = true;
        beta = restBeta;
        gamma = restGamma;
        if (!frame && listening && !paused) frame = requestAnimationFrame(render);
        return;
      }
      if (rebase) {
        rebase = false;
        restBeta = event.beta;
        restGamma = event.gamma;
      }
      beta = event.beta;
      gamma = event.gamma;
      if (!frame && listening && !paused) frame = requestAnimationFrame(render);
    };

    const stopListening = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener("deviceorientation", onOrientation);
      window.clearTimeout(fallbackTimer);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      tiltX = 0;
      tiltY = 0;
      // The phone may be held differently by the time the sensor is read again.
      rebase = true;
      settle();
      written["--tilt-x"] = "0deg";
      written["--tilt-y"] = "0deg";
    };

    const startListening = () => {
      if (listening || paused || !onScreen || gaveUp) return;
      listening = true;
      window.addEventListener("deviceorientation", onOrientation, { passive: true });
      if (!gotReading) {
        // A browser can expose the constructor without any sensor behind it (desktop Chrome in
        // touch emulation, sensors turned off). No reading means the idle float instead.
        fallbackTimer = window.setTimeout(() => {
          if (gotReading) return;
          gaveUp = true;
          stopListening();
          onVisible = null;
          onHidden = null;
          startIdle();
        }, ORIENTATION_TIMEOUT_MS);
      } else {
        el.dataset.tilting = "true";
      }
    };

    const onFocusIn = () => {
      paused = true;
      stopListening();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return;
      paused = false;
      startListening();
    };

    onVisible = startListening;
    onHidden = stopListening;
    if (onScreen) startListening();

    // A rotation changes how the phone is held: the next portrait reading is the new rest.
    const onRotate = () => {
      rebase = true;
    };
    screen.orientation?.addEventListener("change", onRotate);

    el.addEventListener("focusin", onFocusIn);
    el.addEventListener("focusout", onFocusOut);
    cleanups.push(() => {
      screen.orientation?.removeEventListener("change", onRotate);
      el.removeEventListener("focusin", onFocusIn);
      el.removeEventListener("focusout", onFocusOut);
      stopListening();
    });

    return () => cleanups.forEach((fn) => fn());
  }, [max]);

  return (
    <div ref={ref} className={cn("tilt", className)}>
      {children}
    </div>
  );
}
