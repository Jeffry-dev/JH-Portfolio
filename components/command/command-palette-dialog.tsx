"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  ComponentType,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  ArrowUpToLine,
  Check,
  CircleAlert,
  Copy,
  Download,
  FolderGit2,
  Hash,
  List,
  Mail,
  MessageSquareText,
  Phone,
  Search,
  SunMoon,
  X,
} from "lucide-react";
import { OPEN_COMMAND_PALETTE_EVENT, isPaletteShortcut, openCommandPalette } from "@/lib/command-palette";
import { focusTarget, labelledJumpTarget } from "@/lib/focus-target";
import { projectAnchor, skillLinkProps } from "@/lib/tech-links";
import { centerOf, getTheme, toggleTheme, useTheme, type Theme } from "@/lib/theme";
import { cn, toTelHref } from "@/lib/utils";
import { GitHubIcon, LinkedInIcon } from "@/components/ui/brand-icons";
import type { CommandPaletteProject, CommandPaletteProps, CommandPaletteSection } from "./command-palette";

/* ==================================================================
   Commands
   ================================================================== */

type CommandAction =
  | { kind: "navigate"; targetId: string; fallbackId?: string }
  | { kind: "skill"; term: string }
  | { kind: "field"; fieldId: string; headingId: string }
  | { kind: "theme" }
  | { kind: "copy"; value: string }
  | { kind: "link"; href: string; newTab?: boolean; download?: boolean };

/** Normalized label and keywords, built once per command. */
interface SearchIndex {
  label: SearchEntry;
  keywords: SearchEntry[];
}

/** Something inside a section (a skill, a role, a school), found only by searching. */
interface CommandTerm {
  label: string;
  verb: string;
  action: CommandAction;
  search: SearchIndex;
}

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
  icon: ComponentType<{ className?: string }>;
  action: CommandAction;
  search: SearchIndex;
  terms?: CommandTerm[];
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
  skills: ["stack", "technologies", "tools", "tech", "dna"],
  experience: ["work", "jobs", "career", "roles", "history", "employers"],
  projects: ["work", "portfolio", "case studies"],
  education: ["degree", "university", "school", "studies", "training"],
  contact: ["email", "phone", "message", "get in touch", "reach"],
};

/** Queries that list every command, like `help` in the hero terminal. */
const HELP_QUERIES = new Set(["?", "help", "commands", "all commands"]);

/** The contact form (components/sections/contact.tsx and components/contact/contact-form.tsx). */
const CONTACT_FORM = { headingId: "contact-form-title", fieldId: "contact-name" };

/* ==================================================================
   Search: every word of the query must match the label, a keyword or one term of a section
   (case-, accent- and apostrophe-insensitive, by word prefix, so "form" does not find
   "platform"). Label matches rank above keyword matches; a term that matches by name ranks
   with label matches, so "react" lists the skill before the projects that use it.
   ================================================================== */

interface SearchEntry {
  text: string;
  words: string[];
}

/** Lowercase, without accents or apostrophes, so "mcdonalds" finds "McDonald’s". */
function normalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase();
}

function toEntry(text: string): SearchEntry {
  const normalized = normalize(text);
  return { text: normalized, words: normalized.split(/[\s&/.,:;()·+-]+/).filter(Boolean) };
}

function toIndex(label: string, keywords: string[]): SearchIndex {
  return { label: toEntry(label), keywords: keywords.filter(Boolean).map(toEntry) };
}

/** Whole entry or one of its words starts with the token ("next.js" and "js" both find "Next.js"). */
function startsWithToken(entry: SearchEntry, token: string): boolean {
  return entry.text.startsWith(token) || entry.words.some((word) => word.startsWith(token));
}

/** 4: label starts with the token, 3: a word of it does, 2: it contains it, 1: a keyword matches. */
function tokenScore({ label, keywords }: SearchIndex, token: string): number {
  if (label.text.startsWith(token)) return 4;
  if (label.words.some((word) => word.startsWith(token))) return 3;
  if (token.length >= 3 && label.text.includes(token)) return 2;
  return keywords.some((keyword) => startsWithToken(keyword, token)) ? 1 : 0;
}

/** Sum of the token scores, or 0 as soon as one token matches nothing. */
function scoreTokens(tokens: string[], score: (token: string) => number): number {
  let total = 0;
  for (const token of tokens) {
    const value = score(token);
    if (value === 0) return 0;
    total += value;
  }
  return total;
}

/**
 * When a section's own name and keywords do not cover the query, its best matching term (a
 * skill, a role, a school) as a result of its own: the section's label with the term as
 * secondary text, and the term's action.
 */
function bestTerm(command: Command, tokens: string[]): { command: Command; score: number } | null {
  // Words the section itself matches ("skills" in "skills sql") count once; the rest must match the term.
  const termTokens = tokens.filter((token) => tokenScore(command.search, token) === 0);
  const termQuery = termTokens.join(" ");
  let best: { term: CommandTerm; position: number; score: number } | null = null;
  for (const [position, term] of (command.terms ?? []).entries()) {
    const { label, keywords } = term.search;
    const score = scoreTokens(termTokens, (token) => {
      if (label.text.startsWith(token)) return 3;
      if (label.words.some((word) => word.startsWith(token))) return 2;
      return keywords.some((keyword) => startsWithToken(keyword, token)) ? 1 : 0;
    });
    // An exact name ("sql") wins over longer ones that merely start with it ("SQLite").
    const total = score === 0 ? 0 : score + (tokens.length - termTokens.length) + (label.text === termQuery ? 2 : 0);
    if (total > (best?.score ?? 0)) best = { term, position, score: total };
  }
  if (!best) return null;
  const { term, position, score } = best;
  return {
    score,
    command: {
      ...command,
      id: `${command.id}-term-${position}`,
      secondary: term.label,
      verb: term.verb,
      action: term.action,
      terms: undefined,
    },
  };
}

function filterGroups(groups: CommandGroup[], query: string): CommandGroup[] {
  // Punctuation alone ("&") finds nothing useful, so it does not filter.
  const tokens = normalize(query).split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token));
  if (tokens.length === 0) return groups;

  return groups
    .map((group, order) => {
      const ranked = group.commands
        .map((command, position) => {
          const score = scoreTokens(tokens, (token) => tokenScore(command.search, token));
          if (score > 0) return { command, score, position };
          const term = bestTerm(command, tokens);
          return term ? { ...term, position } : null;
        })
        .filter((entry) => entry !== null)
        .sort((a, b) => b.score - a.score || a.position - b.position);
      return { group: { ...group, commands: ranked.map((entry) => entry.command) }, best: ranked[0]?.score ?? 0, order };
    })
    .filter((entry) => entry.group.commands.length > 0)
    .sort((a, b) => b.best - a.best || a.order - b.order)
    .map((entry) => entry.group);
}

/* ==================================================================
   Building the command list
   ================================================================== */

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

function sectionTerms(section: CommandPaletteSection): CommandTerm[] | undefined {
  return section.terms?.map((term) => ({
    label: term.label,
    verb: term.skill ? "to show" : "to jump",
    action: term.skill
      ? { kind: "skill", term: term.skill }
      : { kind: "navigate", targetId: term.targetId ?? section.id, fallbackId: section.id },
    search: toIndex(term.label, term.keywords ?? []),
  }));
}

function buildGroups({ sections, projects, email, phone, resumeUrl, github, linkedin, theme }: BuildInput): CommandGroup[] {
  const command = (fields: Omit<Command, "search">, keywords: string[]): Command => ({
    ...fields,
    search: toIndex(fields.label, keywords),
  });

  const navigation: Command[] = [
    ...sections.map((section) =>
      command(
        {
          id: `section-${section.id}`,
          label: section.label,
          hint: section.index,
          verb: "to jump",
          icon: Hash,
          action: { kind: "navigate", targetId: section.id },
          terms: sectionTerms(section),
        },
        ["section", section.id.replace(/-/g, " "), ...(SECTION_KEYWORDS[section.id] ?? [])],
      ),
    ),
    command(
      {
        id: "back-to-top",
        label: "Back to top",
        verb: "to jump",
        icon: ArrowUpToLine,
        action: { kind: "navigate", targetId: "top" },
      },
      ["top", "home", "start", "hero", "intro"],
    ),
  ];

  const projectCommands = projects.map((project) =>
    command(
      {
        id: `project-${project.id}`,
        label: project.title,
        secondary: project.category,
        verb: "to jump",
        icon: FolderGit2,
        action: { kind: "navigate", targetId: projectAnchor(project.id), fallbackId: "projects" },
      },
      [project.category, "project", "work", ...(project.keywords ?? [])],
    ),
  );

  const actions: Command[] = [
    command(
      {
        id: "write-message",
        label: "Write a message",
        secondary: "Contact form",
        verb: "to write",
        icon: MessageSquareText,
        action: { kind: "field", ...CONTACT_FORM },
      },
      ["form", "message", "write", "contact", "note", "get in touch"],
    ),
    command(
      {
        id: "copy-email",
        label: "Copy email address",
        secondary: email,
        verb: "to copy",
        icon: Copy,
        action: { kind: "copy", value: email },
      },
      ["email", "mail", "address", "clipboard", "contact", email],
    ),
    command(
      {
        id: "send-email",
        label: "Send an email",
        secondary: "Opens your mail app",
        verb: "to email",
        icon: Mail,
        action: { kind: "link", href: `mailto:${email}` },
      },
      ["email", "mail", "message", "write", "contact", email],
    ),
  ];

  if (phone) {
    actions.push(
      command(
        {
          id: "call",
          label: "Call",
          secondary: phone,
          verb: "to call",
          icon: Phone,
          action: { kind: "link", href: toTelHref(phone) },
        },
        ["phone", "call", "telephone", "mobile", "contact", phone],
      ),
    );
  }

  if (resumeUrl) {
    actions.push(
      command(
        {
          id: "download-cv",
          label: "Download CV",
          verb: "to download",
          icon: Download,
          action: { kind: "link", href: resumeUrl, download: true },
        },
        ["cv", "resume", "download", "pdf"],
      ),
    );
  }

  if (github) {
    actions.push(
      command(
        {
          id: "github",
          label: "GitHub",
          hint: "↗",
          external: true,
          verb: "to open",
          icon: GitHubIcon,
          action: { kind: "link", href: github, newTab: true },
        },
        ["github", "code", "repositories", "source", "profile", "social"],
      ),
    );
  }

  if (linkedin) {
    actions.push(
      command(
        {
          id: "linkedin",
          label: "LinkedIn",
          hint: "↗",
          external: true,
          verb: "to open",
          icon: LinkedInIcon,
          action: { kind: "link", href: linkedin, newTab: true },
        },
        ["linkedin", "profile", "network", "social"],
      ),
    );
  }

  actions.push(
    command(
      {
        id: "toggle-theme",
        label: "Toggle theme",
        secondary: theme === "dark" ? "Switch to light" : theme === "light" ? "Switch to dark" : undefined,
        verb: "to switch",
        icon: SunMoon,
        action: { kind: "theme" },
      },
      ["theme", "dark", "light", "mode", "appearance", "color scheme"],
    ),
  );

  return [
    { id: "navigation", label: "Navigation", commands: navigation },
    { id: "projects", label: "Projects", commands: projectCommands },
    { id: "actions", label: "Actions", commands: actions },
  ].filter((group): group is CommandGroup => group.commands.length > 0);
}

/* ==================================================================
   DOM helpers
   ================================================================== */

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Follows a link the way a real anchor would (new tab, download, mailto/tel, in-page jumps). */
function followLink({
  href,
  newTab,
  download,
  attributes,
}: {
  href: string;
  newTab?: boolean;
  download?: boolean;
  attributes?: Record<string, string>;
}) {
  const link = document.createElement("a");
  link.href = href;
  for (const [name, value] of Object.entries(attributes ?? {})) link.setAttribute(name, value);
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

/** Longer than the 200ms exit transition in styles/command-palette.css, so content never vanishes mid-fade. */
const UNMOUNT_DELAY_MS = 260;
/** How long the "Copied" tick stays visible before the palette closes. */
const COPY_CLOSE_DELAY_MS = 700;
/** The page-level announcement waits for focus to settle back on the page, then clears itself. */
const ANNOUNCE_DELAY_MS = 150;
const ANNOUNCE_CLEAR_MS = 5000;

const COPIED_MESSAGE = "Email address copied to clipboard";

/** Entrance stagger of a result row: 20 ms a row, capped at 300 ms (styles/command-palette.css). */
const rowDelay = (index: number) => ({ "--row-delay": `${Math.min(index, 15) * 20}ms` }) as CSSProperties;

/**
 * The command palette dialog, loaded on demand by components/command/command-palette.tsx: jump
 * to any section or project (search also finds skills, employers and schools), open the contact
 * form, switch theme, copy the email address or open contact links. An empty query, "?" or
 * "help" lists every command.
 *
 * Built on the native <dialog> (top layer, inert background, Escape) with the ARIA combobox +
 * listbox pattern: focus stays in the search field and aria-activedescendant tracks the option.
 * The dialog's content is only rendered while it is open (and during its exit transition), so the
 * closed palette costs an empty <dialog>. Once mounted, it handles the shortcut and the open event
 * itself; the host only listens until then.
 *
 * Motion (styles/command-palette.css): the panel scales in from the top edge on desktop and
 * slides up as a sheet on phones; rows rise in with a 20 ms stagger whenever the results change;
 * the current row's accent bar grows from its centre; the key hints fade in after the rows.
 */
export function CommandPaletteDialog({
  sections,
  projects,
  email,
  phone = "",
  resumeUrl = "",
  socials,
  openOnMount = false,
}: CommandPaletteProps & {
  /** Opens right away: the shortcut or a trigger was used before this code had loaded. */
  openOnMount?: boolean;
}) {
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
  /** Last pointer position over the list, to ignore moves that only come from the list scrolling. */
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
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
  /** Set by "Show all commands", so the full list is announced like a "?" query. */
  const [listedAll, setListedAll] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [pageStatus, setPageStatus] = useState("");
  const theme = useTheme();

  const github = socials?.github ?? "";
  const linkedin = socials?.linkedin ?? "";

  const trimmedQuery = query.trim();
  const helpQuery = HELP_QUERIES.has(trimmedQuery.toLowerCase());

  const groups = useMemo(
    () => buildGroups({ sections, projects, email, phone, resumeUrl, github, linkedin, theme }),
    [sections, projects, email, phone, resumeUrl, github, linkedin, theme],
  );
  const visibleGroups = useMemo(
    () => (helpQuery ? groups : filterGroups(groups, query)),
    [groups, query, helpQuery],
  );
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

  // Rows rise in when they mount (styles/command-palette.css). The list is keyed by the ids it
  // shows, so a new set of results mounts fresh and plays the stagger again, while the same
  // results re-rendered (a copy confirmation, a theme change) keep their rows in place.
  const listKey = useMemo(() => flat.map((command) => command.id).join("\n"), [flat]);

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
    lastPointerRef.current = null;

    setQuery("");
    setListedAll(false);
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

  // The host caught an open request while this code was still loading.
  useEffect(() => {
    if (openOnMount) openPalette();
  }, [openOnMount, openPalette]);

  // Phones: the on-screen keyboard shrinks only the visual viewport, so size the panel to it
  // (--palette-vh in styles/command-palette.css) and the last options stay above the keyboard.
  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = dialogRef.current;
    if (!mounted || !viewport || !dialog) return;
    const update = () => {
      // Pinch zoom shrinks the visual viewport too; only the keyboard should shrink the panel.
      if (viewport.scale > 1.01) dialog.style.removeProperty("--palette-vh");
      else dialog.style.setProperty("--palette-vh", `${Math.round(viewport.offsetTop + viewport.height)}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      dialog.style.removeProperty("--palette-vh");
    };
  }, [mounted]);

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

  const navigateTo = (id: string, fallbackId?: string) => {
    const target = document.getElementById(id) ?? (fallbackId ? document.getElementById(fallbackId) : null);
    navigatingRef.current = target !== null;
    closePalette();
    if (!target) return;

    // "auto" follows the CSS scroll-behavior, which globals.css turns off for reduced motion.
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    const hash = `#${target.id}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);
    focusTarget(labelledJumpTarget(target));
  };

  // Goes through a real skill link (lib/tech-links.ts), exactly like a project's stack chip: the
  // browser jumps to #skills and the Technical DNA pins the skill.
  const showSkill = (term: string) => {
    const section = document.getElementById("skills");
    navigatingRef.current = section !== null;
    closePalette();
    if (!section) return;
    const { href, ...attributes } = skillLinkProps(term);
    followLink({ href, attributes });
    focusTarget(labelledJumpTarget(section));
  };

  // A real field, not a jump target: it keeps its focus ring, and phones open the keyboard.
  const focusField = (fieldId: string, headingId: string) => {
    const field = document.getElementById(fieldId);
    navigatingRef.current = field !== null;
    closePalette();
    if (!field) return;
    const anchor = document.getElementById(headingId) ?? field;
    anchor.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    field.focus({ preventScroll: true });
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
        navigateTo(action.targetId, action.fallbackId);
        break;
      case "skill":
        showSkill(action.term);
        break;
      case "field":
        focusField(action.fieldId, action.headingId);
        break;
      case "theme":
        // The switch is visible; screen readers hear it once focus is back on the page.
        pendingAnnouncementRef.current = getTheme() === "dark" ? "Light theme on" : "Dark theme on";
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
    setListedAll(false);
    setActiveIndex(0);
    setCopyStatus("idle");
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const showAllCommands = () => {
    onQueryChange("");
    setListedAll(true);
    inputRef.current?.focus();
  };

  // The pointer picks the active option, except when the list scrolled under a resting pointer
  // (keyboard navigation): the browser then reports a move at the same position.
  const onListPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const last = lastPointerRef.current;
    lastPointerRef.current = { x: event.clientX, y: event.clientY };
    if (last && last.x === event.clientX && last.y === event.clientY) return;
    const option = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-index]") : null;
    const index = Number(option?.dataset.index ?? -1);
    if (index >= 0 && index !== active) setActiveIndex(index);
  };

  /* ---------- render ---------- */

  const resultCount = flat.length;
  const listsAll = helpQuery || (listedAll && !trimmedQuery);
  // A successful copy is announced by the page-level region after the close, not here.
  const announcement =
    copyStatus === "failed"
      ? "Could not copy the email address"
      : listsAll
        ? `All ${resultCount} commands`
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
            {/* Search. Sizes and hints follow the input type: touch gets 16px text (no iOS zoom)
                and a 44px close button; mouse and keyboard get the "esc" key cap. */}
            <div className="command-search relative flex h-14 shrink-0 items-center gap-3 border-b border-line pr-1.5 pl-4 pointer-fine:pr-3">
              <Search aria-hidden="true" className="command-icon-in size-[1.125rem] shrink-0 text-fg-subtle" />
              <label htmlFor={inputId} className="sr-only">
                Search sections, projects, skills and actions
              </label>
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                role="combobox"
                aria-expanded={resultCount > 0}
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
                className="command-input h-full min-w-0 flex-1 bg-transparent text-base text-fg placeholder:text-fg-subtle pointer-fine:text-[0.9375rem]"
              />
              <button
                type="button"
                onClick={closePalette}
                aria-label="Close command palette"
                className="group/close grid size-11 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors duration-150 hover:text-fg focus-visible:text-fg active:text-fg pointer-fine:size-auto pointer-fine:p-1"
              >
                <X aria-hidden="true" className="size-5 pointer-fine:hidden" />
                <kbd className="hidden h-6 items-center rounded-md border border-line-strong bg-tint/[0.04] px-1.5 font-mono text-[0.6875rem] leading-none text-fg-muted transition-colors duration-150 group-hover/close:border-tint/25 group-hover/close:text-fg group-focus-visible/close:border-tint/25 group-focus-visible/close:text-fg pointer-fine:inline-flex">
                  esc
                </kbd>
              </button>
            </div>

            {/* Results */}
            <div
              key={listKey}
              ref={listRef}
              id={listId}
              role="listbox"
              aria-label={listsAll ? "All commands" : "Commands"}
              // Keep focus in the search field when an option is clicked.
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={onListPointerMove}
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
                      style={rowDelay(offsets[groupIndex])}
                      className="command-heading label-mono px-3 pt-3 pb-1.5"
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
                          data-index={index}
                          style={rowDelay(index)}
                          onClick={() => run(command)}
                          className={cn(
                            // The accent bar on the current row is the ::before in styles/command-palette.css.
                            "command-option group relative flex h-12 cursor-pointer items-center gap-3 rounded-lg px-3 transition-[background-color] duration-100 select-none sm:h-11",
                            "aria-selected:bg-tint/[0.06] active:bg-tint/[0.09] aria-selected:active:bg-tint/[0.09]",
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
              <div className="command-empty flex flex-col items-center px-6 pt-10 pb-12 text-center">
                <p className="text-[0.9375rem] text-fg">No results for “{trimmedQuery}”</p>
                <p className="mt-1.5 text-sm text-fg-subtle">Try a section, a project, a skill or “email”.</p>
                <button
                  type="button"
                  onClick={showAllCommands}
                  className="mt-5 inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-tint/[0.03] px-3.5 text-sm text-fg-muted transition-[background-color,border-color,color,scale] duration-150 ease-out-quart hover:border-tint/25 hover:bg-tint/[0.06] hover:text-fg focus-visible:border-tint/25 focus-visible:bg-tint/[0.06] focus-visible:text-fg active:scale-[0.98] pointer-coarse:h-11 pointer-coarse:px-4"
                >
                  <List aria-hidden="true" className="size-4" />
                  Show all commands
                </button>
              </div>
            ) : null}

            {/* Key hints, for keyboards (a fine pointer stands in for "has a keyboard"). They fade
                in after the rows; the Enter hint swaps with a short rise when the verb changes. */}
            <div className="command-hints hidden h-11 shrink-0 items-center gap-5 border-t border-line px-4 text-xs text-fg-subtle pointer-fine:flex">
              <span className="flex items-center gap-1.5">
                <Kbd label="Up arrow">↑</Kbd>
                <Kbd label="Down arrow">↓</Kbd>
                <span>to navigate</span>
              </span>
              {activeCommand ? (
                <span className="flex items-center gap-1.5">
                  <Kbd label="Enter">↵</Kbd>
                  <span key={activeCommand.verb} className="command-hint-swap">
                    {activeCommand.verb}
                  </span>
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Kbd>esc</Kbd>
                <span>to close</span>
              </span>
              {resultCount > 0 && trimmedQuery && !helpQuery ? (
                <button
                  type="button"
                  onClick={showAllCommands}
                  className="-mr-2 ml-auto inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-fg-subtle transition-colors duration-150 hover:bg-tint/[0.05] hover:text-fg focus-visible:bg-tint/[0.05] focus-visible:text-fg"
                >
                  <List aria-hidden="true" className="size-3.5" />
                  All commands
                </button>
              ) : null}
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
