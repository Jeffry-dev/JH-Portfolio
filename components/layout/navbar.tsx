"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { sections } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { focusTarget, labelledJumpTarget } from "@/lib/focus-target";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CommandTrigger } from "@/components/command/command-trigger";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/command-palette";

const sectionIds = sections.map((section) => section.id);

/** Tracks which section crosses the middle band of the viewport (last section wins at the very bottom). */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    const visible = new Map<string, boolean>();
    const atBottom = () =>
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;

    const update = () => {
      if (atBottom()) {
        setActive(ids[ids.length - 1]);
        return;
      }
      setActive(ids.find((id) => visible.get(id)) ?? null);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        update();
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    elements.forEach((el) => observer.observe(el));

    const onScroll = () => {
      if (atBottom()) update();
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [ids]);

  return active;
}

const indicatorText = "block font-mono text-[0.6875rem] leading-[1.1] tracking-wide whitespace-nowrap text-fg-subtle";

/**
 * Logo subtitle that rolls from the job title to the section being read (e.g. "05 / Skills"; labels
 * come from data/navigation.ts). The outgoing label stays mounted for one roll so CSS can move both
 * (styles/navbar.css); the first label renders without motion.
 */
function SectionIndicator({ active, fallback }: { active: string | null; fallback: string }) {
  const section = sections.find((item) => item.id === active);
  const label = section ? `${section.index} / ${section.label}` : fallback;
  const [roll, setRoll] = useState<{ label: string; previous: string | null }>({ label, previous: null });
  if (roll.label !== label) setRoll({ label, previous: roll.label });

  return (
    <span aria-hidden="true" className="relative mt-1 block h-[1.1em] overflow-hidden">
      {roll.previous !== null ? (
        <span key={`out-${roll.previous}`} className={cn(indicatorText, "indicator-out absolute inset-x-0 top-0")}>
          {roll.previous}
        </span>
      ) : null}
      <span key={`in-${roll.label}`} className={cn(indicatorText, roll.previous !== null && "indicator-in")}>
        {roll.label}
      </span>
    </span>
  );
}

/** Sections that get a link in the desktop pill (the only ones the sliding background can point at). */
const desktopSections = sections.filter((section) => section.desktopNav);

/** The mobile menu's rows: one per section, then the email row and the theme row. */
const menuRowCount = sections.length + 2;

/**
 * Stagger for the mobile menu rows (styles/navbar.css): opening, 40 ms then 20 ms per row from
 * the top; closing, 15 ms per row from the bottom, so the whole menu is gone within 300 ms.
 */
const itemDelay = (index: number) =>
  ({
    "--item-delay": `${40 + index * 20}ms`,
    "--item-out-delay": `${(menuRowCount - 1 - index) * 15}ms`,
  }) as CSSProperties;

/**
 * Moves the desktop pill's sliding background (the list's ::before, styles/navbar.css) to the
 * active link. Measured in a frame after every change and whenever the list resizes (fonts
 * loading, the window crossing the desktop breakpoint). Hidden while no linked section is
 * current, and shown in place, without a slide, when it comes back.
 */
function useSlidingPill(list: RefObject<HTMLUListElement | null>, activeId: string | null) {
  useEffect(() => {
    const element = list.current;
    if (!element) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const link = activeId ? element.querySelector<HTMLElement>(`a[href="#${activeId}"]`) : null;
      if (!link || element.clientWidth === 0) {
        element.removeAttribute("data-pill-visible");
        return;
      }
      const wasHidden = !element.hasAttribute("data-pill-visible");
      if (wasHidden) element.setAttribute("data-pill-jump", "");
      element.style.setProperty("--pill-left", `${link.offsetLeft}px`);
      element.style.setProperty("--pill-right", `${element.clientWidth - link.offsetLeft - link.offsetWidth}px`);
      if (wasHidden) {
        // Flush the jump (no transition) before the fade-in, so the pill appears where it belongs.
        void element.offsetWidth;
        element.removeAttribute("data-pill-jump");
      }
      element.setAttribute("data-pill-visible", "");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    schedule();
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [list, activeId]);
}

/** Current-section mark in Windows High Contrast, where the tinted pill background is dropped. */
const forcedCurrent = "forced-colors:underline forced-colors:underline-offset-4";

interface NavbarProps {
  name: string;
  title: string;
  email: string;
}

export function Navbar({ name, title, email }: NavbarProps) {
  const [open, setOpen] = useState(false);
  /** The menu button's icon only animates its swap once the menu has been used, never on first paint. */
  const [menuUsed, setMenuUsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(sectionIds);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLSpanElement>(null);
  const pillRef = useRef<HTMLUListElement>(null);

  useSlidingPill(pillRef, desktopSections.some((section) => section.id === active) ? active : null);

  /** Runs the brand tile's light sweep (styles/navbar.css); a second press restarts it. */
  const shineBrand = () => {
    const tile = brandRef.current;
    if (!tile) return;
    tile.removeAttribute("data-shine");
    void tile.offsetWidth;
    tile.setAttribute("data-shine", "");
  };

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  // The command palette takes over: close the mobile menu so its Escape handler and inert background step aside.
  useEffect(() => {
    const onPaletteOpen = () => {
      if (panelRef.current?.contains(document.activeElement)) close(true);
      else setOpen(false);
    };
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onPaletteOpen);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onPaletteOpen);
  }, [close]);

  // Solid bar once the page has scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Mobile menu: scroll lock, inert background, Escape to close, focus trap, auto-close on desktop widths.
  useEffect(() => {
    if (!open) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";

    // Everything except the header (which holds the toggle and the panel) becomes unreachable,
    // including for screen-reader virtual cursors and swipe navigation.
    const background = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && !el.contains(toggleRef.current),
    );
    background.forEach((el) => {
      el.inert = true;
    });

    panelRef.current?.querySelector<HTMLElement>("a")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
        return;
      }
      const header = toggleRef.current?.closest("header");
      if (event.key !== "Tab" || !header) return;

      // Tab cycles through every visible control in the header in DOM order: logo, Search,
      // theme toggle, menu toggle, then the panel.
      const focusable = Array.from(header.querySelectorAll<HTMLElement>("a[href], button:not([disabled])")).filter(
        (el) => el.getClientRects().length > 0 && !el.closest("[inert]"),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const desktop = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = (event: MediaQueryListEvent) => {
      if (event.matches) close();
    };

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      root.style.overflow = previousOverflow;
      background.forEach((el) => {
        el.inert = false;
      });
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
    };
  }, [open, close]);

  /**
   * Menu link: the native anchor scrolls and updates the hash; focus follows to the section once
   * the menu has closed and the page is no longer inert, as the command palette does.
   */
  const jumpTo = (id: string) => {
    close();
    const target = document.getElementById(id);
    if (target) requestAnimationFrame(() => focusTarget(labelledJumpTarget(target)));
  };

  const solid = scrolled || open;
  const contactActive = active === "contact";

  return (
    <header className="fixed inset-x-0 top-0 z-50 print:hidden">
      <div
        className={cn(
          "border-b transition-[background-color,border-color] duration-300 ease-out-quart",
          solid
            ? // Lighter frosting on the light theme, where a saturated blur reads as a stain on paper.
              "border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150 light:bg-bg/90 light:backdrop-saturate-100"
            : "border-transparent bg-transparent",
        )}
      >
        <nav
          aria-label="Primary"
          className="container-page flex h-16 items-center justify-between gap-3 sm:gap-6 md:h-[4.5rem] lg:grid lg:grid-cols-[1fr_auto_1fr]"
        >
          <a
            href="#top"
            aria-label={`JH, ${name}, back to top`}
            className="group flex min-h-11 min-w-0 items-center gap-3 justify-self-start rounded-lg"
            onClick={() => close()}
            // A mouse already gets the hover sweep; touch and pen presses get their own.
            onPointerDown={(event) => {
              if (event.pointerType !== "mouse") shineBrand();
            }}
          >
            <span
              ref={brandRef}
              aria-hidden="true"
              onAnimationEnd={(event) => {
                if (event.animationName === "brand-shine-tap") event.currentTarget.removeAttribute("data-shine");
              }}
              className="nav-brand grid size-9 shrink-0 place-items-center rounded-[10px] border border-line-strong bg-tint/[0.04] font-mono text-[0.8125rem] font-semibold tracking-tight text-fg transition-colors duration-200 group-hover:border-accent/60 group-hover:text-accent group-focus-visible:border-accent/60 group-focus-visible:text-accent group-active:border-accent/60 group-active:text-accent"
            >
              JH
            </span>
            <span className="flex flex-col leading-none max-[359px]:hidden">
              <span className="font-display text-[0.9375rem] font-semibold tracking-[-0.01em] whitespace-nowrap text-fg">
                {name}
              </span>
              <SectionIndicator active={active} fallback={title} />
            </span>
          </a>

          {/* Desktop links. The current link's background is the list's sliding pill (useSlidingPill);
              the link itself only changes colour. */}
          <ul
            ref={pillRef}
            className="nav-pill hidden items-center gap-1 rounded-full border border-line bg-tint/[0.02] p-1 lg:flex [html:not(.js)_&]:flex [html:not(.js)_&]:max-w-[60vw] [html:not(.js)_&]:overflow-x-auto"
          >
            {desktopSections.map((section) => {
              const isActive = active === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "relative block rounded-full px-4 py-1.5 text-sm transition-[background-color,color,scale] duration-150 ease-out-quart active:scale-[0.98] pointer-coarse:py-3",
                      isActive
                        ? cn("text-fg", forcedCurrent)
                        : "text-fg-muted hover:bg-tint/[0.04] hover:text-fg focus-visible:bg-tint/[0.04] focus-visible:text-fg",
                    )}
                  >
                    {section.label}
                  </a>
                </li>
              );
            })}
          </ul>

          <div className="flex shrink-0 items-center gap-2 justify-self-end">
            <span className="js-only hidden lg:block">
              <CommandTrigger variant="desktop" className="pointer-coarse:h-11" />
            </span>
            <span className="js-only block lg:hidden">
              <CommandTrigger variant="icon" />
            </span>
            <span className="js-only hidden sm:block">
              <ThemeToggle className="size-11 lg:pointer-fine:size-10" />
            </span>
            <a
              href="#contact"
              aria-current={contactActive ? "true" : undefined}
              className={cn(
                "group hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-[background-color,color,scale] duration-150 ease-out-quart active:scale-[0.98] pointer-coarse:h-11 lg:inline-flex",
                contactActive
                  ? cn("bg-accent text-accent-ink", forcedCurrent)
                  : "bg-fg text-bg hover:bg-accent focus-visible:bg-accent",
              )}
            >
              Contact
              <ArrowRight
                aria-hidden="true"
                className="size-4 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
              />
            </a>

            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Menu"
              onClick={() => {
                setMenuUsed(true);
                setOpen((value) => !value);
              }}
              className="js-only grid size-11 shrink-0 place-items-center rounded-full border border-line-strong bg-tint/[0.03] text-fg transition-[background-color,scale] duration-150 ease-out-quart hover:bg-tint/[0.07] focus-visible:bg-tint/[0.07] active:scale-[0.98] lg:hidden"
            >
              {/* Keyed, so each swap mounts a fresh icon and plays its turn (styles/navbar.css). */}
              {open ? (
                <X key="close" aria-hidden="true" className={cn("size-5", menuUsed && "menu-icon-swap")} />
              ) : (
                <Menu key="open" aria-hidden="true" className={cn("size-5", menuUsed && "menu-icon-swap")} />
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu: always rendered; styles/navbar.css shows it while [data-open] and animates both ways. */}
      <div
        id="mobile-menu"
        ref={panelRef}
        data-open={open ? "" : undefined}
        inert={!open}
        className="mobile-menu fixed inset-x-0 top-16 bottom-0 overflow-y-auto border-t border-line bg-bg md:top-[4.5rem]"
      >
        <div className="container-page flex min-h-full flex-col justify-between gap-10 pt-6 pb-10">
          <nav aria-label="Sections">
            <ul className="flex flex-col">
              {sections.map((section, index) => {
                const isActive = active === section.id;
                return (
                  <li key={section.id} className="mobile-menu-item border-b border-line" style={itemDelay(index)}>
                    <a
                      href={`#${section.id}`}
                      onClick={() => jumpTo(section.id)}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "flex min-h-11 items-center justify-between py-3.5 font-display text-[1.625rem] font-semibold tracking-[-0.02em] transition-colors duration-200 ease-out-quart",
                        isActive ? "text-fg" : "text-fg-muted hover:text-fg focus-visible:text-fg active:text-fg",
                      )}
                    >
                      <span className="flex items-center gap-3">
                        {section.label}
                        {isActive ? (
                          <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-accent forced-colors:bg-[CanvasText] forced-colors:forced-color-adjust-none"
                          />
                        ) : null}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn("font-mono text-xs font-normal", isActive ? "text-accent" : "text-fg-subtle")}
                      >
                        {section.index}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* The email and theme rows follow the sections in the same stagger. */}
          <div>
            <div className="mobile-menu-item space-y-2" style={itemDelay(sections.length)}>
              <p className="eyebrow">Get in touch</p>
              <a
                href={`mailto:${email}`}
                className="flex min-h-11 items-center text-lg text-fg underline decoration-line-strong underline-offset-4 transition-[text-decoration-color] duration-200 ease-out-quart [overflow-wrap:anywhere] hover:decoration-accent focus-visible:decoration-accent active:decoration-accent"
              >
                <span>
                  {email.split("@")[0]}
                  <wbr />@{email.split("@")[1]}
                </span>
              </a>
            </div>
            <div
              className="mobile-menu-item mt-6 flex items-center justify-between gap-4 border-t border-line pt-5"
              style={itemDelay(sections.length + 1)}
            >
              <p className="eyebrow">Appearance</p>
              <ThemeToggle className="size-11" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
