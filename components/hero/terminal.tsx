"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { getSection } from "@/data/navigation";
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
  /** Factual status line (profile.statusCard.status). Printed by `status`. */
  status: string;
  /** Core technologies (profile.statusCard.stack, display names). Printed ls-style by `stack`. */
  stack: string[];
  /** IT systems from the "systems" skill group (display names). Listed by the intro's `ls ./systems`. */
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

/** Public commands, in the order `help` lists them. Easter eggs are deliberately not listed. */
const COMMANDS = [
  { name: "help", description: "Show this list" },
  { name: "whoami", description: "Name and role" },
  { name: "about", description: "A short introduction" },
  { name: "skills", description: "Skills by area" },
  { name: "projects", description: "Featured projects, with links" },
  { name: "contact", description: "Email and phone" },
  { name: "status", description: "Current status" },
  { name: "stack", description: "Core technologies" },
  { name: "clear", description: "Clear the screen" },
] as const;

type CommandName = (typeof COMMANDS)[number]["name"];
type PrintingCommand = Exclude<CommandName, "clear">;

const PRINTING_COMMANDS = new Set<string>(COMMANDS.map((command) => command.name).filter((name) => name !== "clear"));

const isPrintingCommand = (value: string): value is PrintingCommand => PRINTING_COMMANDS.has(value);

type Result =
  | { kind: PrintingCommand }
  | { kind: "ls" }
  | { kind: "gpupdate" }
  | { kind: "sudo" }
  | { kind: "unknown"; token: string }
  | { kind: "empty" };

interface Entry {
  id: number;
  input: string;
  result: Result;
}

type Tone = "fg" | "muted";

type IntroLine =
  | { kind: "cmd"; text: string }
  | { kind: "out"; text: string; tone?: Tone }
  | { kind: "list"; items: string[] };

const toneClass: Record<Tone, string> = {
  fg: "text-fg",
  muted: "text-fg-muted",
};

const slug = (value: string) => value.toLowerCase().replace(/\s+/g, "-");

/** Input is already trimmed and whitespace-collapsed. Matching is case-insensitive. */
function resolve(input: string): Result | "clear" {
  if (!input) return { kind: "empty" };
  const [first] = input.split(" ");
  const name = first.toLowerCase();
  if (name === "clear") return "clear";
  // Unlisted, so the intro's `ls ./systems` also works when a visitor types it.
  if (name === "ls") return { kind: "ls" };
  if (name === "gpupdate") return { kind: "gpupdate" };
  if (name === "sudo") return { kind: "sudo" };
  if (isPrintingCommand(name)) return { kind: name };
  return { kind: "unknown", token: first };
}

/**
 * The decorative session typed out on load. Status and stack are left out on purpose:
 * the hero status card shows them (the commands still print them when typed).
 */
function buildIntro(data: TerminalData): IntroLine[] {
  return [
    { kind: "cmd", text: "whoami" },
    { kind: "out", text: data.name },
    { kind: "out", text: data.title, tone: "muted" },
    { kind: "cmd", text: "ls ./systems" },
    { kind: "list", items: data.systems.map(slug) },
  ];
}

/* Shared row styles for clickable output. Rows grow to 44px on touch screens. */
const rowBase =
  "group -mx-2 w-[calc(100%+1rem)] min-h-6 rounded-md px-2 text-left transition-colors duration-150 hover:bg-tint/[0.05] pointer-coarse:min-h-11";
const underline =
  "underline decoration-tint/25 underline-offset-4 transition-[color,text-decoration-color] duration-150 group-hover:text-fg group-hover:decoration-current";

/**
 * Hero terminal.
 * - A short scripted session types itself out on load. It is decorative (aria-hidden):
 *   the same facts are on the page as regular text.
 * - Then a real prompt accepts commands (`help` lists them). Output goes to a polite live log.
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
  const hasOutputAbove = !cleared || entries.length > 0;

  // Start the session (or show it finished under reduced motion / the reveal fallback).
  useEffect(() => {
    const instant =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      document.documentElement.classList.contains("reveal-fallback");
    const timer = window.setTimeout(
      () => setStep((current) => (current < 0 ? (instant ? intro.length : 0) : current)),
      instant ? 0 : START_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [intro.length]);

  // Type commands character by character; print output lines with a short pause.
  useEffect(() => {
    if (step < 0 || step >= intro.length) return;
    const current = intro[step];
    const typing = current.kind === "cmd" && chars < current.text.length;
    const wait = typing
      ? TYPE_MS + Math.random() * TYPE_JITTER_MS
      : current.kind === "cmd"
        ? PAUSE_AFTER_CMD_MS
        : PAUSE_AFTER_OUTPUT_MS;
    const timer = window.setTimeout(() => {
      if (typing) {
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

  const run = (raw: string) => {
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
  };

  return (
    <div className="terminal dark-surface relative overflow-hidden rounded-2xl border border-line-strong bg-bg-raised/95 shadow-[0_40px_100px_-40px_var(--terminal-shadow),inset_0_0_0_1px_color-mix(in_srgb,var(--color-tint)_2%,transparent)]">
      <div aria-hidden="true" className="tilt-glare pointer-events-none absolute inset-0 z-10" />

      {/* Title bar */}
      <div aria-hidden="true" className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-tint/15" />
          <span className="size-2.5 rounded-full bg-tint/15" />
          <span className="size-2.5 rounded-full bg-tint/15" />
        </div>
        <p className="flex-1 truncate text-center font-mono text-[0.6875rem] text-fg-subtle">{data.user}@portfolio: ~</p>
        <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[0.625rem] text-fg-subtle">bash</span>
      </div>

      {/* Body: a click anywhere (outside links and buttons) focuses the prompt. */}
      <div onClick={onBodyClick} className="cursor-text font-mono">
        <div
          ref={scrollRef}
          className="term-scroll @container relative h-[15.5rem] overflow-x-hidden overflow-y-auto px-4 py-4 text-[0.8125rem] leading-[1.75] wrap-anywhere sm:h-[19rem] sm:px-5 sm:py-5 sm:text-[0.84375rem] lg:h-[19.5rem]"
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
                        <p key={index} className={pending}>
                          <Prompt />
                          <span className="text-fg">{current ? line.text.slice(0, chars) : line.text}</span>
                          {current ? <Caret blinking /> : null}
                        </p>
                      );
                    }
                    if (line.kind === "out") {
                      return (
                        <p key={index} className={cn(pending, toneClass[line.tone ?? "fg"])}>
                          {line.text}
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
              onSubmit={onSubmit}
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
                Type help and press Enter to list the available commands. Everything shown here is also on the page.
              </span>
            </form>
          ) : (
            <p aria-hidden="true" className="term-pending mt-3">
              <Prompt />
              <Caret />
            </p>
          )}
        </div>

        {/* Status line. From xl the hero status card overlaps its left side (hints stay on the right). */}
        <div
          aria-hidden="true"
          className="flex h-10 items-center justify-end border-t border-line px-4 font-mono text-[0.6875rem] text-fg-subtle sm:px-5"
        >
          {done ? (
            <>
              <span className="term-hint hidden items-center gap-1.5 pointer-fine:inline-flex">
                <kbd className="rounded border border-line-strong px-1 font-mono text-[0.625rem] leading-4 text-fg-muted">
                  ↑↓
                </kbd>
                history
              </span>
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

function Output({ result, data, onRun }: OutputProps) {
  switch (result.kind) {
    case "help":
      return (
        <div>
          <p className="text-fg-subtle">Available commands:</p>
          <ul className="mt-0.5">
            {COMMANDS.map((command) => (
              <li key={command.name}>
                <button
                  type="button"
                  onClick={(event) => onRun(command.name, event)}
                  className={cn(rowBase, "grid grid-cols-[9ch_minmax(0,1fr)] content-center items-baseline gap-x-3")}
                >
                  <span className="text-(--term-list) transition-colors duration-150 group-hover:text-fg">
                    {command.name}
                  </span>{" "}
                  <span className="text-fg-muted">{command.description}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-1 hidden text-fg-subtle pointer-fine:block">
            <span aria-hidden="true">↑ ↓</span>
            <span className="sr-only">Up and down arrow keys:</span> recall previous commands
          </p>
        </div>
      );

    case "whoami":
      return (
        <div>
          <p className="text-fg">{data.name}</p>
          <p className="text-fg-muted">{data.title}</p>
        </div>
      );

    case "about":
      return (
        <div>
          {data.about.map((line, index) => (
            <p key={line} className={index === 0 ? "text-fg" : "text-fg-muted"}>
              {line}
            </p>
          ))}
          <JumpLink section="about" />
        </div>
      );

    case "skills":
      return (
        <div>
          <ul className="space-y-1.5 @sm:space-y-0.5">
            {data.skills.map((group) => (
              <li key={group.label} className="@sm:grid @sm:grid-cols-[17ch_minmax(0,1fr)] @sm:gap-x-3">
                <span className="block text-fg-subtle">{group.label}</span>
                <span className="block text-fg">{group.items.join(", ")}</span>
              </li>
            ))}
          </ul>
          <JumpLink section="skills" />
        </div>
      );

    case "projects":
      return (
        <ul>
          {data.projects.map((project) => (
            <li key={project.id}>
              <a
                href={`#project-${project.id}`}
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
            <li>
              <a
                href={`mailto:${data.contact.email}`}
                className={cn(rowBase, "grid grid-cols-[6ch_minmax(0,1fr)] content-center items-baseline gap-x-3")}
              >
                <span className="text-fg-subtle">email</span>{" "}
                <span className={cn("text-(--term-list)", underline)}>{data.contact.email}</span>
              </a>
            </li>
            {data.contact.phone && data.contact.phoneHref ? (
              <li>
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
          <JumpLink section="contact" />
        </div>
      );

    case "status":
      return <StatusLine text={data.status} />;

    case "stack":
      return <ListLine items={data.stack.map(slug)} />;

    case "ls":
      return <ListLine items={data.systems.map(slug)} />;

    case "gpupdate":
      return (
        <div className="text-fg">
          <p>Updating policy...</p>
          <div aria-hidden="true" className="h-[1lh]" />
          <p>Computer Policy update has completed successfully.</p>
          <p>User Policy update has completed successfully.</p>
        </div>
      );

    case "sudo":
      return (
        <p>
          <span className="text-danger">Permission denied:</span>{" "}
          <span className="text-fg-muted">this portfolio runs on least privilege.</span>
        </p>
      );

    case "unknown":
      return (
        <p className="text-fg-muted">
          <span className="text-danger">command not found:</span> <span className="text-fg">{result.token}</span>
          {". Type 'help' to see what's available."}
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

function ListLine({ items, className }: { items: string[]; className?: string }) {
  return (
    <p className={cn("flex flex-wrap gap-x-4 text-(--term-list)", className)}>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </p>
  );
}

function StatusLine({ text, className }: { text: string; className?: string }) {
  return (
    <p className={cn("text-fg", className)}>
      <span aria-hidden="true" className="text-ok">
        ●
      </span>{" "}
      {text}
    </p>
  );
}

/** Points to the page section that holds the full version of an answer. */
function JumpLink({ section }: { section: string }) {
  const meta = getSection(section);
  return (
    <p className="mt-0.5">
      <a
        href={`#${meta.id}`}
        className="group -mx-2 inline-flex min-h-6 items-center gap-2 rounded-md px-2 text-fg-muted transition-colors duration-150 hover:bg-tint/[0.05] pointer-coarse:min-h-11"
      >
        <span aria-hidden="true" className="text-fg-subtle">
          ↳
        </span>
        <span className={underline}>Go to {meta.label}</span>
      </a>
    </p>
  );
}
