/**
 * The single guard for every JavaScript-driven effect on the site. Client-only: call these
 * inside effects or event handlers, never during render.
 *
 * - motionAllowed(): the visitor has not asked for reduced motion, and the device is not
 *   asking to save data or reporting low memory. Every touch effect and every idle animation
 *   starts from here.
 * - isTouchDevice(): the primary input cannot hover or is coarse (phones, tablets). Used to
 *   choose the touch-native version of an effect (tap glow, tap ripple, orientation tilt).
 * - pointerEffectsAllowed(): motion is allowed AND the primary input is a hover-capable fine
 *   pointer. Gates every cursor-following effect (ambient light, magnetic button, terminal
 *   tilt, kinetic name, card spotlights).
 *
 * The two device checks are complementary: a device is either a fine hover pointer or a touch
 * device, so a pointer path and a touch path never run at the same time.
 */
export function motionAllowed(): boolean {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const lowPower = nav.connection?.saveData === true || (nav.deviceMemory !== undefined && nav.deviceMemory < 4);
  return !reduce && !lowPower;
}

export function isTouchDevice(): boolean {
  return window.matchMedia("(hover: none), (pointer: coarse)").matches;
}

export function pointerEffectsAllowed(): boolean {
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  return fine && motionAllowed();
}
