/**
 * Focus handling after an in-page jump (command palette, mobile menu): focus moves to the
 * chosen section or project, so keyboard and screen-reader users continue reading from there
 * and hear where they landed. The browser still does the scrolling; focus never scrolls.
 *
 * A jump target is not a control, so it shows no focus ring while it carries
 * JUMP_TARGET_ATTR (see styles/navbar.css), like #main.
 */
export const JUMP_TARGET_ATTR = "data-jump-target";

/** Focuses a jump target without scrolling. A temporary tabindex makes plain sections focusable. */
export function focusTarget(target: HTMLElement) {
  if (!target.hasAttribute("tabindex") && target.tabIndex < 0) {
    target.setAttribute("tabindex", "-1");
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  target.setAttribute(JUMP_TARGET_ATTR, "");
  target.addEventListener("blur", () => target.removeAttribute(JUMP_TARGET_ATTR), { once: true });
  target.focus({ preventScroll: true });
}

/**
 * What to focus for a jump target: the target itself when it has a name (sections), otherwise its
 * labelled <article> (each project <li> wraps one), so screen readers announce where focus landed.
 */
export function labelledJumpTarget(target: HTMLElement): HTMLElement {
  if (target.hasAttribute("aria-labelledby") || target.hasAttribute("aria-label")) return target;
  return target.querySelector<HTMLElement>("article[aria-labelledby]") ?? target;
}
