"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ComponentType, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import {
  ArrowUpToLine,
  Check,
  CircleAlert,
  Copy,
  Download,
  FolderGit2,
  Hash,
  Mail,
  Phone,
  Search,
  SunMoon,
  X,
} from "lucide-react";
import { OPEN_COMMAND_PALETTE_EVENT, isApplePlatform, openCommandPalette } from "@/lib/command-palette";
import { centerOf, toggleTheme, useTheme, type Theme } from "@/lib/theme";
import { cn, toTelHref } from "@/lib/utils";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/brand-icons";

/* ==================================================================
   Public props (supplied by app/page.tsx, a server component)
   ================================================================== */

export interface CommandPaletteSection {
  id: string;
  label: string;
  /** Two-digit section number, shown as the right-hand hint. */
  index: string;
}

export interface CommandPaletteProject {
  id: string;
  title: string;
  category: string;
  /** Extra search terms (context, stack, modules), so "nestjs" finds it. Not displayed. */
  keywords?: string[];
}

export interface CommandPaletteProps {
  sections: CommandPaletteSection[];
  projects: CommandPaletteProject[];
  email: string;
  /** Empty or missing hides "Call". */
  phone?: string;
  /** Empty or missing hides "Download CV". */
  resumeUrl?: string;
  /** Empty values hide the matching link. */
  socials?: { github?: string; linkedin?: string };
}

/* ==================================================================
   Commands
   ================================================================== */

type CommandAction =
  | { kind: "navigate"; targetId: string }
  | { kind: "theme" }
  | { kind: "copy"; value: string }
  | { kind: "link"; href: string; newTab?: boolean; download?: boolean };

interface Command {
  id: string;
  label: string;
  secondary?: string;
  /** Right-hand hint, e.g. a section number. Decorative. */
  hint?: string;
  /** Opens in a new tab: shows "↗" and tells screen readers. */
  external?: boolean;
  /** What Enter does, shown in the footer ("↵ to jump"). */
  verb: string;
  keywords: string[];
  icon: ComponentType<{ className?: string }>;
  action: CommandAction;
}

interface CommandGroup {
  id: "navigation" | "projects" | "actions";
  label: string;
  commands: Command[];
}

type CopyStatus = "idle" | "copied" | "failed";

/** Search aids for each section. Never displayed. */
const SECTION_KEYWORDS: Record<string, string[]> = {
  about: ["profile", "bio", "introduction", "who"],
  "what-i-do": ["focus", "areas", "services", "systems", "software"],
  skills: ["stack", "technologies", "tools", "tech"],
  experience: ["work", "jobs", "career", "roles", "history"],
  projects: ["work", "portfolio", "case studies"],
  education: ["degree", "university", "school", "studies"],
  contact: ["email", "phone", "message", "get in touch", "reach"],
};

interface BuildInput {
  sections: CommandPaletteSection[];
  projects: CommandPaletteProject[];
  email: string;
  phone: string;
  resumeUrl: string;
  github: string;
  linkedin: string;
  theme: Theme | null;
}

function buildGroups({ sections, projects, email, phone, resumeUrl, github, linkedin, theme }: BuildInput): CommandGroup[] {
  const navigation: Command[] = [
    ...sections.map<Command>((section) => ({
      id: `section-${section.id}`,
      label: section.label,
      hint: section.index,
      verb: "to jump",
      keywords: ["section", section.id.replace(/-/g, " "), ...(SECTION_KEYWORDS[section.id] ?? [])],
      icon: Hash,
      action: { kind: "navigate", targetId: section.id },
    })),
    {
      id: "back-to-top",
      label: "Back to top",
      verb: "to jump",
      keywords: ["top", "home", "start", "hero", "intro"],
      icon: ArrowUpToLine,
      action: { kind: "navigate", targetId: "top" },
    },
  ];

  const projectCommands = projects.map<Command>((project) => ({
    id: `project-${project.id}`,
    label: project.title,
    secondary: project.category,
    verb: "to jump",
    keywords: [project.category, "project", "work", ...(project.keywords ?? [])],
    icon: FolderGit2,
    action: { kind: "navigate", targetId: `project-${project.id}` },
  }));

  const actions: Command[] = [
    {
      id: "toggle-theme",
      label: "Toggle theme",
      secondary: theme === "dark" ? "Switch to light" : theme === "light" ? "Switch to dark" : undefined,
      verb: "to switch",
      keywords: ["theme", "dark", "light", "mode", "appearance", "color scheme"],
      icon: SunMoon,
      action: { kind: "theme" },
    },
    {
      id: "copy-email",
      label: "Copy email address",
      secondary: email,
      verb: "to copy",
      keywords: ["email", "mail", "address", "clipboard", "contact", email],
      icon: Copy,
      action: { kind: "copy", value: email },
    },
    {
      id: "send-email",
      label: "Send an email",
      secondary: "Opens your mail app",
      verb: "to email",
      keywords: ["email", "mail", "message", "write", "contact", email],
      icon: Mail,
      action: { kind: "link", href: `mailto:${email}` },
    },
  ];

  if (phone) {
    actions.push({
      id: "call",
      label: "Call",
      secondary: phone,
      verb: "to call",
      keywords: ["phone", "call", "telephone", "mobile", "contact", phone],
      icon: Phone,
      action: { kind: "link", href: toTelHref(phone) },
    });
  }

  if (resumeUrl) {
    actions.push({
      id: "download-cv",
      label: "Download CV",
      verb: "to download",
      keywords: ["cv", "resume", "download", "pdf"],
      icon: Download,
      action: { kind: "link", href: resumeUrl, download: true },
    });
  }

  if (github) {
    actions.push({
      id: "github",
      label: "GitHub",
      hint: "↗",
      external: true,
      verb: "to open",
      keywords: ["github", "code", "repositories", "source", "profile", "social"],
      icon: GitHubIcon,
      action: { kind: "link", href: github, newTab: true },
    });
  }

  if (linkedin) {
    actions.push({
      id: "linkedin",
      label: "LinkedIn",
      hint: "↗",
      external: true,
      verb: "to open",
      keywords: ["linkedin", "profile", "network", "social"],
      icon: LinkedInIcon,
      action: { kind: "link", href: linkedin, newTab: true },
    });
  }

  return [
    { id: "navigation", label: "Navigation", commands: navigation },
    { id: "projects", label: "Projects", commands: projectCommands },
    { id: "actions", label: "Actions", commands: actions },
  ].filter((group): group is CommandGroup => group.commands.length > 0);
}

/* ==================================================================
   Filtering: every word of the query must match the label or a keyword
   (case-insensitive). Label matches rank above keyword matches.
   ================================================================== */

function scoreCommand(command: Command, tokens: string[]): number {
  const label = command.label.toLowerCase();
  const words = label.split(/[\s&/-]+/);
  const keywords = command.keywords.join(" ").toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (label.startsWith(token)) score += 4;
    else if (words.some((word) => word.startsWith(token))) score += 3;
    else if (label.includes(token)) score += 2;
    else if (keywords.includes(token)) score += 1;
    else return 0;
  }
  return score;
}

function filterGroups(groups: CommandGroup[], query: string): CommandGroup[] {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return groups;

  return groups
    .map((group, order) => {
      const ranked = group.commands
        .map((command, position) => ({ command, position, score: scoreCommand(command, tokens) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || a.position - b.position);
      return { group: { ...group, commands: ranked.map((entry) => entry.command) }, best: ranked[0]?.score ?? 0, order };
    })
    .filter((entry) => entry.group.commands.length > 0)
    .sort((a, b) => b.best - a.best || a.order - b.order)
    .map((entry) => entry.group);
}

/* ==================================================================
   DOM helpers
   ================================================================== */

/**
 * Cmd+K on Apple devices, Ctrl+K elsewhere, including keyboard layouts where the K key types
 * another letter. Only one of the two is claimed, so on macOS Ctrl+K keeps its system meaning
 * in text fields (delete to the end of the line).
 */
function isPaletteShortcut(event: KeyboardEvent) {
  const modifier = isApplePlatform() ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (!modifier || event.altKey || event.shiftKey || event.isComposing) return false;
  if (typeof event.key !== "string") return false;
  const key = event.key.toLowerCase();
  if (key === "k") return true;
  // Non-Latin layouts (e.g. Arabic) report a different character for the same physical key.
  return !/^[a-z]$/.test(key) && event.code === "KeyK";
}

/** Focuses a jump target so keyboard and screen-reader users continue from there. */
function focusTarget(target: HTMLElement) {
  if (!target.hasAttribute("tabindex") && target.tabIndex < 0) {
    target.setAttribute("tabindex", "-1");
    target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
  }
  target.setAttribute("data-command-target", "");
  target.addEventListener("blur", () => target.removeAttribute("data-command-target"), { once: true });
  target.focus({ preventScroll: true });
}

/**
 * What to focus for a jump target: the target itself when it has a name (sections), otherwise its
 * labelled <article> (each project <li> wraps one), so screen readers announce where focus landed.
 */
function labelledJumpTarget(target: HTMLElement): HTMLElement {
  if (target.hasAttribute("aria-labelledby") || target.hasAttribute("aria-label")) return target;
  return target.querySelector<HTMLElement>("article[aria-labelledby]") ?? target;
}

/** Follows a link the way a real anchor would (new tab, download, mailto/tel). */
function followLink({ href, newTab, download }: { href: string; newTab?: boolean; download?: boolean }) {
  const link = document.createElement("a");
  link.href = href;
  const sameOrigin = link.origin === window.location.origin;
  if (download && sameOrigin) {
    link.download = "";
  } else if (newTab || download) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  document.body.append(link);
  link.click();
  link.remove();
}

/** Keeps the active option (and its group heading, for the first option of a group) inside the list. */
function keepInView(list: HTMLElement, option: HTMLElement, isFirst: boolean) {
  if (isFirst) {
    list.scrollTop = 0;
    return;
  }
  const previous = option.previousElementSibling;
  const top = previous instanceof HTMLElement && previous.hasAttribute("data-command-heading") ? previous : option;
  const listRect = list.getBoundingClientRect();
  const topEdge = top.getBoundingClientRect().top;
  const bottomEdge = option.getBoundingClientRect().bottom;
  const padding = 8;
  if (topEdge < listRect.top + padding) {
    list.scrollTop -= listRect.top + padding - topEdge;
  } else if (bottomEdge > listRect.bottom - padding) {
    list.scrollTop += bottomEdge - (listRect.bottom - padding);
  }
}

function isBackdropPointer(event: ReactMouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return false;
  const rect = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom
  );
}

function Kbd({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-tint/[0.04] px-1 font-mono text-[0.6875rem] leading-none text-fg-muted",
        className,
      )}
    >
      {label ? (
        <>
          <span aria-hidden="true">{children}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        children
      )}
    </kbd>
  );
}

/* ==================================================================
   Component
   ================================================================== */

/** Longer than the 140ms exit transition in styles/command-palette.css, so content never vanishes mid-fade. */
const UNMOUNT_DELAY_MS = 220;
/** How long the "Copied" tick stays visible before the palette closes. */
const COPY_CLOSE_DELAY_MS = 700;
/** The page-level announcement waits for focus to settle back on the page, then clears itself. */
const ANNOUNCE_DELAY_MS = 150;
const ANNOUNCE_CLEAR_MS = 5000;

const COPIED_MESSAGE = "Email address copied to clipboard";

/**
 * Site-wide command palette: jump to any section or project, switch theme, copy the email
 * address or open contact links. Opens with Cmd+K on Apple devices, Ctrl+K elsewhere, or
 * `openCommandPalette()`.
 *
 * Built on the native <dialog> (top layer, inert background, Escape) with the ARIA combobox +
 * listbox pattern: focus stays in the search field and aria-activedescendant tracks the option.
 * The dialog's content is only rendered while it is open (and during its exit transition), so the
 * closed palette costs an empty <dialog> in the HTML. The shortcut listener is always active.
 */
export function CommandPalette({
  sections,
  projects,
  email,
  phone = "",
  resumeUrl = "",
  socials,
}: CommandPaletteProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const optionId = (command: Command) => `${baseId}-option-${command.id}`;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** Element that had focus before opening; focus returns there unless we navigated. */
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const navigatingRef = useRef(false);
  const backdropPressRef = useRef(false);
  const closeTimerRef = useRef<number | undefined>(undefined);
  const unmountTimerRef = useRef<number | undefined>(undefined);
  const statusTimersRef = useRef<number[]>([]);
  /** Spoken from the page-level status region once the palette has closed. */
  const pendingAnnouncementRef = useRef<string | null>(null);

  /** Whether the dialog's content is rendered. */
  const [mounted, setMounted] = useState(false);
  /** Bumped by every open; the layout effect below shows the dialog once its content is in the DOM. */
  const [openRequest, setOpenRequest] = useState(0);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [pageStatus, setPageStatus] = useState("");
  const theme = useTheme();

  const github = socials?.github ?? "";
  const linkedin = socials?.linkedin ?? "";

  const groups = useMemo(
    () => buildGroups({ sections, projects, email, phone, resumeUrl, github, linkedin, theme }),
    [sections, projects, email, phone, resumeUrl, github, linkedin, theme],
  );
  const visibleGroups = useMemo(() => filterGroups(groups, query), [groups, query]);
  // Flat option order (for arrow keys) and where each group starts in it.
  const { flat, offsets } = useMemo(() => {
    const commands: Command[] = [];
    const starts: number[] = [];
    for (const group of visibleGroups) {
      starts.push(commands.length);
      commands.push(...group.commands);
    }
    return { flat: commands, offsets: starts };
  }, [visibleGroups]);

  const active = flat.length > 0 ? Math.min(activeIndex, flat.length - 1) : -1;
  const activeCommand = active >= 0 ? flat[active] : undefined;
  const trimmedQuery = query.trim();

  /* ---------- announcements outside the dialog ---------- */

  /**
   * Speaks a message through the status region next to the dialog. It lives outside the dialog,
   * so closing the palette does not cut it off; the short delay lets the screen reader finish
   * announcing the element that got focus back first.
   */
  const announce = (message: string) => {
    for (const timer of statusTimersRef.current) window.clearTimeout(timer);
    setPageStatus("");
    statusTimersRef.current = [
      window.setTimeout(() => setPageStatus(message), ANNOUNCE_DELAY_MS),
      window.setTimeout(() => setPageStatus(""), ANNOUNCE_DELAY_MS + ANNOUNCE_CLEAR_MS),
    ];
  };

  /* ---------- open / close ---------- */

  const openPalette = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(unmountTimerRef.current);
    const previous = document.activeElement;
    returnFocusRef.current = previous instanceof HTMLElement && previous !== document.body ? previous : null;
    navigatingRef.current = false;
    pendingAnnouncementRef.current = null;

    setQuery("");
    setActiveIndex(0);
    setCopyStatus("idle");
    setMounted(true);
    setOpenRequest((count) => count + 1);
  }, []);

  // Runs after the content has been committed and before paint, so the entry transition starts
  // with the full panel and focus lands in the search field right away.
  useLayoutEffect(() => {
    if (openRequest === 0) return;
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;

    // A modal dialog has to stay usable even if another overlay (the mobile menu) made the page inert.
    if (dialog.inert) dialog.inert = false;
    dialog.showModal();
    if (listRef.current) listRef.current.scrollTop = 0;
    inputRef.current?.focus();
  }, [openRequest]);

  const closePalette = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // Fires after every close (Escape, backdrop, command, shortcut). The event is queued, so ignore
  // one that arrives after the palette has already been reopened.
  const handleClose = () => {
    if (dialogRef.current?.open) return;
    window.clearTimeout(closeTimerRef.current);
    window.clearTimeout(unmountTimerRef.current);
    unmountTimerRef.current = window.setTimeout(() => {
      if (!dialogRef.current?.open) setMounted(false);
    }, UNMOUNT_DELAY_MS);

    const message = pendingAnnouncementRef.current;
    pendingAnnouncementRef.current = null;
    if (message) announce(message);

    if (navigatingRef.current) {
      navigatingRef.current = false;
      return;
    }
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target?.isConnected && document.activeElement !== target) target.focus({ preventScroll: true });
  };

  // The shortcut toggles (also while typing in a field); openCommandPalette() opens.
  // The shortcut goes through the shared event, so other components (the mobile menu) can react to it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isPaletteShortcut(event)) return;
      event.preventDefault();
      if (event.repeat) return;
      if (dialogRef.current?.open) closePalette();
      else openCommandPalette();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, openPalette);
    };
  }, [openPalette, closePalette]);

  useEffect(() => {
    const closeTimer = closeTimerRef;
    const unmountTimer = unmountTimerRef;
    const statusTimers = statusTimersRef;
    return () => {
      window.clearTimeout(closeTimer.current);
      window.clearTimeout(unmountTimer.current);
      for (const timer of statusTimers.current) window.clearTimeout(timer);
    };
  }, []);

  /* ---------- commands ---------- */

  const navigateTo = (id: string) => {
    const target = document.getElementById(id);
    navigatingRef.current = target !== null;
    closePalette();
    if (!target) return;

    // "auto" follows the CSS scroll-behavior, which globals.css turns off for reduced motion.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    const hash = `#${id}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    focusTarget(labelledJumpTarget(target));
  };

  const copyToClipboard = async (value: string) => {
    window.clearTimeout(closeTimerRef.current);
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setCopyStatus("failed");
      return;
    }
    if (!dialogRef.current?.open) {
      // Closed while the clipboard was busy: confirm on the page right away.
      announce(COPIED_MESSAGE);
      return;
    }
    // Sighted users get a short look at the tick; the confirmation is spoken after the close.
    setCopyStatus("copied");
    pendingAnnouncementRef.current = COPIED_MESSAGE;
    closeTimerRef.current = window.setTimeout(closePalette, COPY_CLOSE_DELAY_MS);
  };

  const run = (command: Command) => {
    const { action } = command;
    switch (action.kind) {
      case "navigate":
        navigateTo(action.targetId);
        break;
      case "theme":
        toggleTheme(centerOf(dialogRef.current));
        closePalette();
        break;
      case "copy":
        void copyToClipboard(action.value);
        break;
      case "link":
        // Close first: the page outside the modal dialog is inert while it is open.
        closePalette();
        followLink(action);
        break;
    }
  };

  /* ---------- keyboard + pointer ---------- */

  const moveTo = (index: number) => {
    // Still browsing after a copy: stay open (the confirmation is still spoken on close).
    window.clearTimeout(closeTimerRef.current);
    setActiveIndex(index);
    const list = listRef.current;
    const option = document.getElementById(optionId(flat[index]));
    if (list && option) keepInView(list, option, index === 0);
  };

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const count = flat.length;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (count > 0) moveTo((active + 1) % count);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (count > 0) moveTo((active - 1 + count) % count);
        break;
      case "Home":
        if (count === 0 || event.shiftKey) return;
        event.preventDefault();
        moveTo(0);
        break;
      case "End":
        if (count === 0 || event.shiftKey) return;
        event.preventDefault();
        moveTo(count - 1);
        break;
      case "Enter":
        if (!activeCommand) return;
        event.preventDefault();
        run(activeCommand);
        break;
    }
  };

  const onQueryChange = (value: string) => {
    // Typing after a copy: stay open (the confirmation is still spoken on close).
    window.clearTimeout(closeTimerRef.current);
    setQuery(value);
    setActiveIndex(0);
    setCopyStatus("idle");
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  /* ---------- render ---------- */

  const resultCount = flat.length;
  // A successful copy is announced by the page-level region after the close, not here.
  const announcement =
    copyStatus === "failed"
      ? "Could not copy the email address"
      : trimmedQuery
        ? resultCount === 0
          ? `No results for ${trimmedQuery}`
          : `${resultCount} ${resultCount === 1 ? "result" : "results"}`
        : "";

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-label="Command palette"
        onClose={handleClose}
        onPointerDown={(event) => {
          backdropPressRef.current = isBackdropPointer(event);
        }}
        onClick={(event) => {
          if (backdropPressRef.current && isBackdropPointer(event)) closePalette();
          backdropPressRef.current = false;
        }}
        className="command-palette rounded-2xl border border-line-strong bg-bg/85 text-fg backdrop-blur-xl backdrop-saturate-150 light:bg-bg/[0.92]"
      >
        {mounted ? (
          <>
            {/* Search */}
            <div className="command-search relative flex h-14 shrink-0 items-center gap-3 border-b border-line pr-1.5 pl-4 sm:pr-3">
              <Search aria-hidden="true" className="size-[1.125rem] shrink-0 text-fg-subtle" />
              <label htmlFor={inputId} className="sr-only">
                Search sections, projects and actions
              </label>
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                role="combobox"
                aria-expanded="true"
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={activeCommand ? optionId(activeCommand) : undefined}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="go"
                placeholder="Search or jump to…"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                onKeyDown={onInputKeyDown}
                className="command-input h-full min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-subtle sm:text-[0.9375rem]"
              />
              <button
                type="button"
                onClick={closePalette}
                aria-label="Close command palette"
                className="group/close grid size-11 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors hover:text-fg sm:size-auto sm:p-1 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
              >
                <X aria-hidden="true" className="size-5 sm:hidden" />
                <kbd className="hidden h-6 items-center rounded-md border border-line-strong bg-tint/[0.04] px-1.5 font-mono text-[0.6875rem] leading-none text-fg-muted transition-colors group-hover/close:border-tint/25 group-hover/close:text-fg sm:inline-flex">
                  esc
                </kbd>
              </button>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label="Commands"
              // Keep focus in the search field when an option is clicked.
              onMouseDown={(event) => event.preventDefault()}
              className={cn("command-list min-h-0 overflow-y-auto", resultCount > 0 && "p-2")}
            >
              {visibleGroups.map((group, groupIndex) => {
                const headingId = `${baseId}-group-${group.id}`;
                return (
                  <div key={group.id} role="group" aria-labelledby={headingId} className="command-group">
                    <div
                      id={headingId}
                      aria-hidden="true"
                      data-command-heading=""
                      className="command-heading eyebrow px-3 pt-3 pb-1.5"
                    >
                      {group.label}
                    </div>
                    {group.commands.map((command, position) => {
                      const index = offsets[groupIndex] + position;
                      const isActive = index === active;
                      const isCopy = command.action.kind === "copy";
                      const copied = isCopy && copyStatus === "copied";
                      const failed = isCopy && copyStatus === "failed";
                      const Icon = copied ? Check : failed ? CircleAlert : command.icon;
                      const label = copied ? "Copied to clipboard" : failed ? "Could not copy" : command.label;

                      return (
                        <div
                          key={command.id}
                          id={optionId(command)}
                          role="option"
                          aria-selected={isActive}
                          onPointerMove={(event) => {
                            if (event.pointerType !== "touch" && !isActive) setActiveIndex(index);
                          }}
                          onClick={() => run(command)}
                          className={cn(
                            "command-option group relative flex h-12 cursor-pointer items-center gap-3 rounded-lg px-3 select-none sm:h-11",
                            "before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent before:opacity-0 before:transition-opacity before:duration-150",
                            "aria-selected:bg-tint/[0.06] aria-selected:before:opacity-100",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "grid size-7 shrink-0 place-items-center rounded-md border transition-colors duration-150",
                              copied
                                ? "border-ok/40 bg-ok/10 text-ok"
                                : failed
                                  ? "border-danger/40 bg-danger/10 text-danger"
                                  : "border-line bg-tint/[0.03] text-fg-muted group-aria-selected:border-accent/35 group-aria-selected:bg-accent/10 group-aria-selected:text-accent",
                            )}
                          >
                            <Icon
                              key={copied ? "copied" : failed ? "failed" : "idle"}
                              className={cn("size-4", copied && "command-pop")}
                            />
                          </span>

                          <span className="flex min-w-0 flex-1 flex-col sm:flex-row sm:items-baseline sm:gap-2">
                            <span
                              className={cn(
                                "truncate text-[0.9375rem] leading-tight",
                                copied ? "text-ok" : failed ? "text-danger" : "text-fg",
                              )}
                            >
                              {label}
                            </span>
                            {command.secondary ? (
                              <span className="truncate text-xs leading-tight text-fg-subtle group-aria-selected:text-fg-muted sm:text-sm">
                                {command.secondary}
                              </span>
                            ) : null}
                          </span>

                          {command.hint ? (
                            <span
                              aria-hidden="true"
                              className="shrink-0 font-mono text-xs text-fg-subtle group-aria-selected:text-fg-muted"
                            >
                              {command.hint}
                            </span>
                          ) : null}
                          {command.external ? <span className="sr-only">(opens in a new tab)</span> : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {resultCount === 0 ? (
              <div className="px-6 pt-10 pb-12 text-center">
                <p className="text-[0.9375rem] text-fg">No results for “{trimmedQuery}”</p>
                <p className="mt-1.5 text-sm text-fg-subtle">Try a section name, a project or “email”.</p>
              </div>
            ) : null}

            {/* Key hints (desktop) */}
            <div className="hidden h-11 shrink-0 items-center gap-5 border-t border-line px-4 text-xs text-fg-subtle sm:flex">
              <span className="flex items-center gap-1.5">
                <Kbd label="Up arrow">↑</Kbd>
                <Kbd label="Down arrow">↓</Kbd>
                <span>to navigate</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd label="Enter">↵</Kbd>
                <span>{activeCommand?.verb ?? "to select"}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>esc</Kbd>
                <span>to close</span>
              </span>
            </div>

            <p role="status" className="sr-only">
              {announcement}
            </p>
          </>
        ) : null}
      </dialog>

      {/* Page-level status, outside the dialog: confirmations that outlive the palette. */}
      <p role="status" className="sr-only">
        {pageStatus}
      </p>
    </>
  );
}
