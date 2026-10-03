"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { sections } from "@/data/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CommandTrigger } from "@/components/command/command-trigger";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/command-palette";

const ease = [0.16, 1, 0.3, 1] as const;
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

/** Logo subtitle that rolls from the job title to the section being read (e.g. "03 / Skills"; labels come from data/navigation.ts). */
function SectionIndicator({ active, fallback }: { active: string | null; fallback: string }) {
  const section = sections.find((item) => item.id === active);
  const label = section ? `${section.index} / ${section.label}` : fallback;
  return (
    <span aria-hidden="true" className="relative mt-1 block h-[1.1em] overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <m.span
          key={label}
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.4, ease }}
          className="block font-mono text-[0.6875rem] leading-[1.1] tracking-wide whitespace-nowrap text-fg-subtle"
        >
          {label}
        </m.span>
      </AnimatePresence>
    </span>
  );
}

interface NavbarProps {
  name: string;
  title: string;
  email: string;
}

export function Navbar({ name, title, email }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = useActiveSection(sectionIds);
  const reduceMotion = useReducedMotion();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

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
      if (event.key !== "Tab" || !panelRef.current || !toggleRef.current) return;

      const focusable = [
        toggleRef.current,
        ...panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ];
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

  const solid = scrolled || open;
  const contactActive = active === "contact";

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "border-b transition-[background-color,border-color] duration-300",
          solid ? "border-line bg-bg/80 backdrop-blur-xl backdrop-saturate-150" : "border-transparent bg-transparent",
        )}
      >
        <nav
          aria-label="Primary"
          className="container-page flex h-16 items-center justify-between gap-3 sm:gap-6 md:h-[4.5rem] lg:grid lg:grid-cols-[1fr_auto_1fr]"
        >
          <a
            href="#top"
            aria-label={`JH, ${name}, back to top`}
            className="group flex min-w-0 items-center gap-3 justify-self-start rounded-lg"
            onClick={() => close()}
          >
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-line-strong bg-tint/[0.04] font-mono text-[0.8125rem] font-semibold tracking-tight text-fg transition-colors group-hover:border-accent/60 group-hover:text-accent"
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

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 rounded-full border border-line bg-tint/[0.02] p-1 lg:flex [html:not(.js)_&]:flex [html:not(.js)_&]:max-w-[60vw] [html:not(.js)_&]:overflow-x-auto">
            {sections
              .filter((section) => section.desktopNav)
              .map((section) => {
                const isActive = active === section.id;
                return (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      aria-current={isActive ? "true" : undefined}
                      className={cn(
                        "relative block rounded-full px-4 py-1.5 text-sm transition-[background-color,color,transform] duration-200 active:scale-[0.97]",
                        isActive ? "bg-tint/[0.08] text-fg" : "text-fg-muted hover:bg-tint/[0.04] hover:text-fg",
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
              <CommandTrigger variant="desktop" />
            </span>
            <span className="js-only block lg:hidden">
              <CommandTrigger variant="icon" />
            </span>
            <span className="js-only hidden sm:block">
              <ThemeToggle className="size-11 lg:size-10" />
            </span>
            <a
              href="#contact"
              aria-current={contactActive ? "true" : undefined}
              className={cn(
                "group hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-[background-color,color,transform] duration-200 active:scale-[0.97] lg:inline-flex",
                contactActive ? "bg-accent text-accent-ink" : "bg-fg text-bg hover:bg-accent",
              )}
            >
              Contact
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>

            <button
              ref={toggleRef}
              type="button"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Menu"
              onClick={() => setOpen((value) => !value)}
              className="js-only grid size-11 shrink-0 place-items-center rounded-full border border-line-strong bg-tint/[0.03] text-fg transition-[background-color,transform] duration-200 hover:bg-tint/[0.07] active:scale-95 lg:hidden"
            >
              {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {open ? (
          <m.div
            key="mobile-menu"
            id="mobile-menu"
            ref={panelRef}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, clipPath: "inset(0 0 0% 0)" }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: { duration: 0.12 } }
                : { opacity: 0, clipPath: "inset(0 0 100% 0)", transition: { duration: 0.28, ease: [0.7, 0, 0.84, 0] } }
            }
            transition={{ duration: reduceMotion ? 0.12 : 0.5, ease }}
            className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto border-t border-line bg-bg md:top-[4.5rem] lg:hidden"
          >
            <div className="container-page flex min-h-full flex-col justify-between gap-10 pt-6 pb-10">
              <nav aria-label="Mobile">
                <ul className="flex flex-col">
                  {sections.map((section, index) => {
                    const isActive = active === section.id;
                    return (
                      <m.li
                        key={section.id}
                        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.08 + index * 0.045, ease }}
                        className="border-b border-line"
                      >
                        <a
                          href={`#${section.id}`}
                          onClick={() => close()}
                          aria-current={isActive ? "true" : undefined}
                          className={cn(
                            "flex items-center justify-between py-3.5 font-display text-[1.625rem] font-semibold tracking-[-0.02em] transition-colors",
                            isActive ? "text-fg" : "text-fg-muted hover:text-fg",
                          )}
                        >
                          <span className="flex items-center gap-3">
                            {section.label}
                            {isActive ? <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" /> : null}
                          </span>
                          <span
                            aria-hidden="true"
                            className={cn("font-mono text-xs font-normal", isActive ? "text-accent" : "text-fg-subtle")}
                          >
                            {section.index}
                          </span>
                        </a>
                      </m.li>
                    );
                  })}
                </ul>
              </nav>

              <m.div
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease }}
                className="space-y-2"
              >
                <p className="eyebrow">Get in touch</p>
                <a
                  href={`mailto:${email}`}
                  className="flex min-h-11 items-center text-lg text-fg underline decoration-line-strong underline-offset-4 [overflow-wrap:anywhere] hover:decoration-accent"
                >
                  <span>
                    {email.split("@")[0]}
                    <wbr />@{email.split("@")[1]}
                  </span>
                </a>
                <div className="mt-6 flex items-center justify-between gap-4 border-t border-line pt-5">
                  <p className="eyebrow">Appearance</p>
                  <ThemeToggle className="size-11" />
                </div>
              </m.div>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
