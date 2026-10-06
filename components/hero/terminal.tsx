"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { getSection } from "@/data/navigation";
import { useIsApplePlatform } from "@/lib/command-palette";
import { projectAnchor } from "@/lib/tech-links";
import { cn } from "@/lib/utils";

/**
 * Everything the terminal can print. Built on the server from /data (see sections/hero.tsx),
 * so this client component never imports the data modules.
 */
export interface TerminalData {
  /** Lowercase login name for the title bar, e.g. "jeffry". */
  user: string;
  name: string;
  title: string;
  /** Current employer. `whoami` prints it with the title. */
  company: string;
  /** Current job (profile.statusCard.status). Printed by `status`. */
  status: string;
  /** Optional availability (profile.statusCard.availability). `status` prints it, with the green dot, only when set. */
  availability?: string;
  /** Core technologies (profile.statusCard.stack, display names). Printed ls-style by `stack`. */
  stack: string[];
  /** IT systems from the "systems" skill group (display names). Listed by `ls ./systems`. */
  systems: string[];
  /** Two or three short, factual lines. */
  about: string[];
  skills: { label: string; items: string[] }[];
  projects: { id: string; index: string; title: string; category: string }[];
  /** `phone` and `phoneHref` may be "" to hide the phone row. */
  contact: { email: string; phone: string; phoneHref: string };
}

interface TerminalProps {
  data: TerminalData;
}

const TYPE_MS = 40;
const TYPE_JITTER_MS = 40;
const PAUSE_AFTER_CMD_MS = 280;
const PAUSE_AFTER_OUTPUT_MS = 170;
const START_DELAY_MS = 900;
const MAX_ENTRIES = 40;
const MAX_HISTORY = 50;
/** Printed rows land one after another (.term-row in styles/terminal.css); long lists are capped. */
const ROW_STAGGER_MS = 40;
const ROW_STAGGER_CAP = 14;

/** Public commands, in the order `help` lists them. Easter eggs are deliberately not listed. */
const COMMANDS = [
  { name: "help", description: "Show this list" },
  { name: "whoami", description: "Name and role" },
  { name: "about", description: "A short introduction" },
  { name: "skills", description: "Skills by area" },
  { name: "projects", description: "Featured projects" },
  { name: "contact", description: "Email and phone" },
  { name: "status", description: "Current status" },
  { name: "stack", description: "Core technologies" },
  { name: "clear", description: "Clear the screen" },
] as const;

type CommandName = (typeof COMMANDS)[number]["name"];
type PrintingCommand = Exclude<CommandName, "clear">;

const PRINTING_COMMANDS = new Set<string>(COMMANDS.map((command) => command.name).filter((name) => name !== "clear"));

const isPrintingCommand = (value: string): value is PrintingCommand => PRINTING_COMMANDS.has(value);

/** The directories `ls` knows about (the home directory lists both). */
const DIRECTORIES = ["projects", "systems"] as const;

type Directory = (typeof DIRECTORIES)[number];

const isDirectory = (value: string): value is Directory => (DIRECTORIES as readonly string[]).includes(value);

type Result =
  | { kind: PrintingCommand }
  | { kind: "ls"; dir: Directory | "home" }
  | { kind: "ls-missing"; path: string }
  | { kind: "gpupdate" }
  | { kind: "sudo" }
  | { kind: "unknown"; token: string; suggestion?: CommandName }
  | { kind: "empty" };

interface Entry {
  id: number;
  input: string;
  result: Result;
}

type IntroLine = { kind: "cmd"; text: string } | { kind: "list"; items: string[] };

const slug = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

/** Input is already trimmed and whitespace-collapsed. Matching is case-insensitive. */
function resolve(input: string): Result | "clear" {
  if (!input) return { kind: "empty" };
  const [first, ...args] = input.split(" ");
  const name = first.toLowerCase();
  if (name === "clear") return "clear";
  // Unlisted, so the intro's `ls ./projects` and `ls ./systems` also work when typed.
  if (name === "ls") return resolveLs(args);
  if (name === "gpupdate") return { kind: "gpupdate" };
  if (name === "sudo") return { kind: "sudo" };
  if (isPrintingCommand(name)) return { kind: name };
  return { kind: "unknown", token: first, suggestion: closestCommand(name) };
}

/** `ls`, `ls ~`, `ls ./projects`, `ls -la systems/` and so on. Flags are accepted and ignored. */
function resolveLs(args: string[]): Result {
  const target = args.find((arg) => !arg.startsWith("-"));
  if (target === undefined) return { kind: "ls", dir: "home" };
  const path = target
    .toLowerCase()
    .replace(/^[~.](\/|$)/, "")
    .replace(/\/+$/, "");
  if (!path) return { kind: "ls", dir: "home" };
  if (isDirectory(path)) return { kind: "ls", dir: path };
  return { kind: "ls-missing", path: target };
}

/** The listed command closest to a mistyped one (one edit for short names, two for longer ones). */
function closestCommand(token: string): CommandName | undefined {
  let best: { name: CommandName; distance: number } | undefined;
  for (const { name } of COMMANDS) {
    const distance = editDistance(token, name);
    if (distance <= (name.length <= 4 ? 1 : 2) && (!best || distance < best.distance)) best = { name, distance };
  }
  return best?.name;
}

/** Edit distance where swapping two neighboring letters counts as one edit ("hlep" is one from "help"). */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return Infinity;
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * The decorative session typed out on load: what there is to see, not who he is (the h1 right
 * beside it already says that). Status and stack are left out too, because the hero status bar
 * shows them. Every command here, and `whoami`, `status` and `stack`, still works when typed.
 */
function buildIntro(data: TerminalData): IntroLine[] {
  return [
    { kind: "cmd", text: "ls ./projects" },
    { kind: "list", items: data.projects.map((project) => project.id) },
    { kind: "cmd", text: "ls ./systems" },
    { kind: "list", items: data.systems.map(slug) },
  ];
}

/** Order of a printed row within its output block, for the entrance stagger. */
const row = (index: number) => ({ "--i": index }) as CSSProperties;

/* Shared row styles for clickable output. Rows grow to 44px on touch screens. */
const rowBase =
  "group -mx-2 w-[calc(100%+1rem)] min-h-6 rounded-md px-2 text-left transition-colors duration-150 hover:bg-tint/[0.05] focus-visible:bg-tint/[0.05] active:bg-tint/[0.08] pointer-coarse:min-h-11";
const underline =
  "underline decoration-tint/25 underline-offset-4 transition-[color,text-decoration-color] duration-150 group-hover:text-fg group-hover:decoration-current group-focus-visible:text-fg group-focus-visible:decoration-current";

/**
 * Hero terminal.
 * - A short scripted session types itself out on load. It is decorative (aria-hidden):
 *   the same facts are on the page as regular text. While it types, the frame carries a soft
 *   breathing accent ring (data-typing) that fades once the prompt is ready.
 * - Then a real prompt accepts commands (`help` lists them). Output goes to a polite live log.
 *   Printed rows land one after another (`--i` on each row), and running a command, or tapping
 *   the body to type, flashes the prompt row briefly (data-flash).
 * - Nothing here is required for navigation; every answer also exists in a page section.
 * - Stays dark in both themes (.dark-surface). Under reduced motion the session is shown
 *   finished, with the prompt ready. It never takes focus on its own.
 */
export function Terminal({ data }: TerminalProps) {
  const intro = useMemo(() => buildIntro(data), [data]);
  const blocks = useMemo(
    () =>
      intro.reduce<{ start: number; lines: IntroLine[] }[]>((acc, line, index) => {
        if (line.kind === "cmd" || acc.length === 0) return [...acc, { start: index, lines: [line] }];
        const last = acc[acc.length - 1];
        return [...acc.slice(0, -1), { ...last, lines: [...last.lines, line] }];
      }, []),
    [intro],
  );

  // `step` = index of the intro line being revealed (-1 before start, intro.length when done).
  const [step, setStep] = useState(-1);
  const [chars, setChars] = useState(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cleared, setCleared] = useState(false);
  const [value, setValue] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const cursorRef = useRef(-1);
  const draftRef = useRef("");
  const nextIdRef = useRef(0);
  const focusWhenReadyRef = useRef(false);

  const baseId = useId();
  const inputId = `${baseId}-input`;
  const hintId = `${baseId}-hint`;

  const done = step >= intro.length;
  const typing = step >= 0 && !done;
  const hasOutputAbove = !cleared || entries.length > 0;

  // Start the session, or show it finished: under reduced motion, and when the page's scripts
  // started late, since the reveal fallback has already shown the finished session.
  useEffect(() => {
    const { classList } = document.documentElement;
    const instant =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      classList.contains("reveal-fallback") ||
      classList.contains("reveal-late");
    const timer = window.setTimeout(
      () => setStep((current) => (current < 0 ? (instant ? intro.length : 0) : current)),
      instant ? 0 : START_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [intro.length]);

  // Type commands character by character; print output lines with a short pause. The pause after
  // a listing grows with its length, so its rows have landed before the next command is typed.
  useEffect(() => {
    if (step < 0 || step >= intro.length) return;
    const current = intro[step];
    const typingChar = current.kind === "cmd" && chars < current.text.length;
    const wait = typingChar
      ? TYPE_MS + Math.random() * TYPE_JITTER_MS
      : current.kind === "cmd"
        ? PAUSE_AFTER_CMD_MS
        : PAUSE_AFTER_OUTPUT_MS + Math.min(current.items.length, ROW_STAGGER_CAP) * ROW_STAGGER_MS;
    const timer = window.setTimeout(() => {
      if (typingChar) {
        setChars((count) => count + 1);
      } else {
        setStep((index) => index + 1);
        setChars(0);
      }
    }, wait);
    return () => window.clearTimeout(timer);
  }, [step, chars, intro]);

  // A click during the intro skips it; focus the prompt once it exists.
  useEffect(() => {
    if (!done || !focusWhenReadyRef.current) return;
    focusWhenReadyRef.current = false;
    inputRef.current?.focus({ preventScroll: true });
  }, [done]);

  // Keep the line being typed in view on short screens.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && step >= 0) el.scrollTop = el.scrollHeight;
  }, [step]);

  // New output: show it from its first line if it is taller than the viewport, else scroll to the prompt.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = el.querySelector<HTMLElement>("[data-entry]:last-child");
    if (!last) {
      el.scrollTop = 0;
      return;
    }
    el.scrollTop = Math.min(last.offsetTop - 12, el.scrollHeight - el.clientHeight);
  }, [entries]);

  const focusInput = () => inputRef.current?.focus({ preventScroll: true });

  // A 150ms accent flash behind the prompt row (.term-prompt[data-flash]). Remove, flush, add,
  // so commands in quick succession each get their own flash. Cleared again on animationend.
  const flashPrompt = () => {
    const form = promptRef.current;
    if (!form) return;
    form.removeAttribute("data-flash");
    form.getBoundingClientRect();
    form.setAttribute("data-flash", "");
  };
  const onFlashEnd = (event: AnimationEvent<HTMLFormElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.removeAttribute("data-flash");
  };

  const run = (raw: string) => {
    flashPrompt();
    const input = raw.trim().replace(/\s+/g, " ");
    if (input) {
      const history = historyRef.current;
      if (history[history.length - 1] !== input) history.push(input);
      if (history.length > MAX_HISTORY) history.shift();
    }
    cursorRef.current = -1;
    draftRef.current = "";

    const result = resolve(input);
    if (result === "clear") {
      setEntries([]);
      setCleared(true);
      return;
    }
    nextIdRef.current += 1;
    const entry: Entry = { id: nextIdRef.current, input, result };
    setEntries((list) => [...list, entry].slice(-MAX_ENTRIES));
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    run(value);
    setValue("");
  };

  // Up/Down recall previous commands, like a shell. The unsent draft is restored at the end.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    const history = historyRef.current;

    if (event.key === "ArrowUp") {
      if (history.length === 0) return;
      event.preventDefault();
      if (cursorRef.current === -1) {
        draftRef.current = value;
        cursorRef.current = history.length - 1;
      } else {
        cursorRef.current = Math.max(0, cursorRef.current - 1);
      }
      setValue(history[cursorRef.current]);
    } else if (event.key === "ArrowDown") {
      if (cursorRef.current === -1) return;
      event.preventDefault();
      const next = cursorRef.current + 1;
      if (next >= history.length) {
        cursorRef.current = -1;
        setValue(draftRef.current);
      } else {
        cursorRef.current = next;
        setValue(history[next]);
      }
    }
  };

  // Commands listed by `help` are clickable. Keyboard activation and desktop clicks return
  // focus to the prompt; taps on touch screens don't, so the on-screen keyboard stays closed.
  const runFromOutput = (command: string, event: MouseEvent<HTMLButtonElement>) => {
    run(command);
    if (event.detail === 0 || window.matchMedia("(pointer: fine)").matches) focusInput();
  };

  // A click or tap anywhere in the body (outside links, buttons and the input) focuses the prompt,
  // on every kind of pointer; the flash shows where typing goes, which matters on touch screens
  // where the only other sign is the keyboard opening.
  const onBodyClick = (event: MouseEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest("a, button, input")) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return; // don't break text selection
    if (!done) {
      focusWhenReadyRef.current = true;
      setStep(intro.length);
      setChars(0);
      return;
    }
    focusInput();
    flashPrompt();
  };

  return (
    <div
      data-typing={typing ? "" : undefined}
      className="terminal dark-surface relative overflow-hidden rounded-2xl border border-line-strong bg-bg-raised/95 shadow-[0_40px_100px_-40px_var(--terminal-shadow),inset_0_0_0_1px_color-mix(in_srgb,var(--color-tint)_2%,transparent)]"
    >
      <div aria-hidden="true" className="tilt-glare pointer-events-none absolute inset-0 z-10" />

      {/* Title bar */}
      <div aria-hidden="true" className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-tint/15" />
          <span className="size-2.5 rounded-full bg-tint/15" />
          <span className="size-2.5 rounded-full bg-tint/15" />
        </div>
        <p className="flex-1 truncate text-center font-mono text-[0.6875rem] text-fg-subtle">{data.user}@portfolio: ~</p>
        <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-fg-subtle">
          bash
        </span>
      </div>

      {/* Body: a click anywhere (outside links and buttons) focuses the prompt. */}
      <div onClick={onBodyClick} className="cursor-text font-mono">
        {/* Fixed height, so output never shifts the page. From 640px the `help` list and the
            prompt under it fit together; on phones its 44px touch rows scroll. */}
        <div
          ref={scrollRef}
          className="term-scroll @container relative h-[19rem] overflow-x-hidden overflow-y-auto px-4 py-4 text-[0.8125rem] leading-[1.75] wrap-anywhere sm:h-[20rem] sm:px-5 sm:py-5 sm:text-[0.84375rem]"
        >
          {/* Scripted session (decorative) */}
          {!cleared ? (
            <div aria-hidden="true" className="space-y-3">
              {blocks.map((block) => (
                <div key={block.start} className={cn(block.start > step && "term-pending")}>
                  {block.lines.map((line, offset) => {
                    const index = block.start + offset;
                    const pending = index > step ? "term-pending" : undefined;
                    if (line.kind === "cmd") {
                      const current = index === step;
                      return (
                        <p key={index} className={cn("term-row", pending)}>
                          <Prompt />
                          <span className="text-fg">{current ? line.text.slice(0, chars) : line.text}</span>
                          {current ? <Caret blinking /> : null}
                        </p>
                      );
                    }
                    return <ListLine key={index} items={line.items} className={pending} />;
                  })}
                </div>
              ))}
            </div>
          ) : null}

          {/* Interactive history */}
          <div
            role="log"
            aria-live="polite"
            aria-label="Terminal output"
            className={cn("space-y-3", !cleared && entries.length > 0 && "mt-3")}
          >
            {entries.map((entry) => (
              <div key={entry.id} data-entry="" className="term-entry">
                <p>
                  <Prompt />
                  <span className="sr-only">Command: </span>
                  <span className="text-fg">{entry.input}</span>
                </p>
                <Output result={entry.result} data={data} onRun={runFromOutput} />
              </div>
            ))}
          </div>

          {done ? (
            <form
              ref={promptRef}
              onSubmit={onSubmit}
              onAnimationEnd={onFlashEnd}
              className={cn(
                "term-prompt flex items-center text-base pointer-fine:text-[0.8125rem] pointer-fine:sm:text-[0.84375rem]",
                hasOutputAbove && "mt-3",
              )}
            >
              <label htmlFor={inputId} className="sr-only">
                Terminal command
              </label>
              <Prompt />
              <input
                ref={inputRef}
                id={inputId}
                type="text"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder={entries.length === 0 && !cleared ? 'try "help"' : undefined}
                aria-describedby={hintId}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                enterKeyHint="go"
                maxLength={120}
                className="term-input min-w-0 flex-1 bg-transparent p-0 text-fg placeholder:text-fg-subtle"
              />
              <span id={hintId} className="sr-only">
                Type help and press Enter to list the available commands. Up and down arrows recall previous
                commands. Everything shown here is also on the page.
              </span>
            </form>
          ) : (
            <p aria-hidden="true" className="term-pending mt-3">
              <Prompt />
              <Caret />
            </p>
          )}
        </div>

        {/* Status line: input hints (right) once the prompt accepts input. */}
        <div
          aria-hidden="true"
          className="flex h-10 items-center justify-end gap-4 border-t border-line px-4 font-mono text-xs text-fg-subtle sm:px-5"
        >
          {done ? (
            <>
              <span className="term-hint hidden items-center gap-1.5 pointer-fine:inline-flex">
                <kbd className="rounded border border-line-strong px-1 font-mono text-[0.6875rem] leading-4 text-fg-muted">
                  ↑↓
                </kbd>
                history
              </span>
              <PaletteHint />
              <span className="term-hint pointer-fine:hidden">tap to type</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   Output
   ------------------------------------------------------------------ */

interface OutputProps {
  result: Result;
  data: TerminalData;
  onRun: (command: string, event: MouseEvent<HTMLButtonElement>) => void;
}

/** Status-line hint pointing keyboard users at the command palette (shortcut per platform). */
function PaletteHint() {
  const apple = useIsApplePlatform();
  return (
    <span className="term-hint hidden items-center gap-1.5 pointer-fine:inline-flex">
      <kbd className="rounded border border-line-strong px-1 font-mono text-[0.6875rem] leading-4 text-fg-muted">
        {apple ? "⌘K" : "Ctrl K"}
      </kbd>
      palette
    </span>
  );
}

function Output({ result, data, onRun }: OutputProps) {
  switch (result.kind) {
    case "help":
      return (
        <div>
          <p className="term-row text-fg-subtle" style={row(0)}>
            Available commands:
          </p>
          <ul className="mt-0.5">
            {COMMANDS.map((command, index) => (
              <li key={command.name} className="term-row" style={row(index + 1)}>
                <button
                  type="button"
                  onClick={(event) => onRun(command.name, event)}
                  className={cn(rowBase, "grid grid-cols-[9ch_minmax(0,1fr)] content-center items-baseline gap-x-3")}
                >
                  <span className="text-(--term-list) transition-colors duration-150 group-hover:text-fg group-focus-visible:text-fg">
                    {command.name}
                  </span>{" "}
                  <span className="text-fg-muted">{command.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      );

    case "whoami":
      return (
        <div>
          <p className="term-row text-fg" style={row(0)}>
            {data.name}
          </p>
          <p className="term-row text-fg-muted" style={row(1)}>
            {data.title} at {data.company}
          </p>
        </div>
      );

    case "about":
      return (
        <div>
          {data.about.map((line, index) => (
            <p key={line} className={cn("term-row", index === 0 ? "text-fg" : "text-fg-muted")} style={row(index)}>
              {line}
            </p>
          ))}
          <JumpLink section="about" index={data.about.length} />
        </div>
      );

    case "skills":
      return (
        <div>
          <ul className="space-y-1.5 @sm:space-y-0.5">
            {data.skills.map((group, index) => (
              <li
                key={group.label}
                className="term-row @sm:grid @sm:grid-cols-[17ch_minmax(0,1fr)] @sm:gap-x-3"
                style={row(index)}
              >
                <span className="block text-fg-subtle">{group.label}</span>
                <span className="block text-fg">{group.items.join(", ")}</span>
              </li>
            ))}
          </ul>
          <JumpLink section="skills" index={data.skills.length} />
        </div>
      );

    case "projects":
      return (
        <ul>
          {data.projects.map((project, index) => (
            <li key={project.id} className="term-row" style={row(index)}>
              <a
                href={`#${projectAnchor(project.id)}`}
                className={cn(rowBase, "grid grid-cols-[2ch_minmax(0,1fr)] content-center items-baseline gap-x-3")}
              >
                <span aria-hidden="true" className="text-fg-subtle">
                  {project.index}
                </span>
                <span>
                  <span className={cn("text-(--term-list)", underline)}>{project.title}</span>{" "}
                  <span className="block text-fg-muted @sm:ml-1.5 @sm:inline">{project.category}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      );

    case "contact":
      return (
        <div>
          <ul>
            <li className="term-row" style={row(0)}>
              <a
                href={`mailto:${data.contact.email}`}
                className={cn(rowBase, "grid grid-cols-[6ch_minmax(0,1fr)] content-center items-baseline gap-x-3")}
              >
                <span className="text-fg-subtle">email</span>{" "}
                <span className={cn("text-(--term-list)", underline)}>{data.contact.email}</span>
              </a>
            </li>
            {data.contact.phone && data.contact.phoneHref ? (
              <li className="term-row" style={row(1)}>
                <a
                  href={data.contact.phoneHref}
                  className={cn(rowBase, "grid grid-cols-[6ch_minmax(0,1fr)] content-center items-baseline gap-x-3")}
                >
                  <span className="text-fg-subtle">phone</span>{" "}
                  <span className={cn("text-(--term-list)", underline)}>{data.contact.phone}</span>
                </a>
              </li>
            ) : null}
          </ul>
          <JumpLink section="contact" index={data.contact.phone && data.contact.phoneHref ? 2 : 1} />
        </div>
      );

    case "status":
      return (
        <div>
          <StatusLine text={data.status} index={0} />
          {data.availability ? <StatusLine text={data.availability} live index={1} /> : null}
        </div>
      );

    case "stack":
      return <ListLine items={data.stack.map(slug)} />;

    case "ls":
      return (
        <ListLine
          items={
            result.dir === "home"
              ? [...DIRECTORIES]
              : result.dir === "projects"
                ? data.projects.map((project) => project.id)
                : data.systems.map(slug)
          }
        />
      );

    case "ls-missing":
      return (
        <p className="term-row text-fg-muted" style={row(0)}>
          <span className="text-danger">ls: cannot access</span> <span className="text-fg">&apos;{result.path}&apos;</span>
          : No such file or directory
        </p>
      );

    case "gpupdate":
      return (
        <div className="text-fg">
          <p className="term-row" style={row(0)}>
            Updating policy...
          </p>
          <div aria-hidden="true" className="h-[1lh]" />
          <p className="term-row" style={row(1)}>
            Computer Policy update has completed successfully.
          </p>
          <p className="term-row" style={row(2)}>
            User Policy update has completed successfully.
          </p>
        </div>
      );

    case "sudo":
      return (
        <p className="term-row" style={row(0)}>
          <span className="text-danger">Permission denied:</span>{" "}
          <span className="text-fg-muted">this portfolio runs on least privilege.</span>
        </p>
      );

    case "unknown":
      return (
        <p className="term-row text-fg-muted" style={row(0)}>
          <span className="text-danger">command not found:</span> <span className="text-fg">{result.token}</span>
          {result.suggestion ? (
            <>
              . Did you mean <span className="text-(--term-list)">{result.suggestion}</span>?
            </>
          ) : (
            <>
              . Type <span className="text-(--term-list)">help</span> to see what’s available.
            </>
          )}
        </p>
      );

    case "empty":
      return null;
  }
}

/* ------------------------------------------------------------------
   Small pieces
   ------------------------------------------------------------------ */

function Prompt() {
  return (
    <span aria-hidden="true" className="shrink-0 whitespace-pre select-none">
      <span className="text-accent">~</span> <span className="text-fg-subtle">$</span>{" "}
    </span>
  );
}

/** Blinks only while the intro types; rests as a solid block on the static prompt. */
function Caret({ blinking = false }: { blinking?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.18em] bg-accent/90",
        blinking ? "animate-caret" : "opacity-70",
      )}
    />
  );
}

/** An ls-style listing; its entries land one after another. */
function ListLine({ items, className }: { items: string[]; className?: string }) {
  return (
    <p className={cn("flex flex-wrap gap-x-4 text-(--term-list)", className)}>
      {items.map((item, index) => (
        <span key={item} className="term-row" style={row(index)}>
          {item}
        </span>
      ))}
    </p>
  );
}

/** A status row. Only a `live` row (availability) gets the green dot, as in the hero status bar. */
function StatusLine({ text, live = false, index }: { text: string; live?: boolean; index: number }) {
  return (
    <p className="term-row text-fg" style={row(index)}>
      <span aria-hidden="true" className={live ? "text-ok" : "text-fg-subtle"}>
        ●
      </span>{" "}
      {text}
    </p>
  );
}

/** Points to the page section that holds the full version of an answer. `index` is its row order. */
function JumpLink({ section, index }: { section: string; index: number }) {
  const meta = getSection(section);
  return (
    <p className="term-row mt-0.5" style={row(index)}>
      <a
        href={`#${meta.id}`}
        className="group -mx-2 inline-flex min-h-6 items-center gap-2 rounded-md px-2 text-fg-muted transition-colors duration-150 hover:bg-tint/[0.05] focus-visible:bg-tint/[0.05] active:bg-tint/[0.08] pointer-coarse:min-h-11"
      >
        <span aria-hidden="true" className="text-fg-subtle">
          ↳
        </span>
        <span className={underline}>Go to {meta.label}</span>
      </a>
    </p>
  );
}
