"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { RotateCcw, X } from "lucide-react";
import { FROM_SKILL_ATTR, SKILL_LINK_ATTR, projectAnchor } from "@/lib/tech-links";
import { sameTech, spoken } from "@/components/projects/architecture-text";

/**
 * The interactive part of an architecture figure: the header, the drawing (nodes, connectors,
 * modules) and an inspector under it. The figure shell and the sr-only caption stay
 * server-rendered in architecture-diagram.tsx; node icons arrive pre-rendered from the server.
 *
 * Interaction: hovering a part (fine pointer) or focusing it with the keyboard previews it; a
 * click, tap, Enter or Space pins it, and the same again releases it; Escape or the inspector's
 * Clear button clears the pin. Keyboard focus outranks hover, and hover outranks the pin. The
 * inspector shows the active part's label, technology and description, or a neutral hint.
 * Hovering or focusing a stack chip in the same card lights the nodes that name that
 * technology, and so does arriving from a Technical DNA link that carries `data-from-skill`.
 * On touch, pressing a chip lights those nodes for the press plus half a second, without
 * getting in the way of the link.
 *
 * Data flow: when the diagram comes into view (any device) the nodes light up from top to
 * bottom with a pulse running down each arrow, twice; while a mouse rests on the card it keeps
 * flowing. The "Architecture" label in the header is a button that replays two cycles (the
 * touch-native way to see it again; keyboard too). It pauses while a part is inspected, and
 * reduced motion leaves it out.
 *
 * Touch feedback: a pressed part (`data-pressed`, touch or pen only) scales down and flashes its
 * border and icon tile in accent for at least 150 ms, so every tap is seen even when the
 * browser's own :active state lags behind the finger.
 *
 * ARIA: every part is a toggle button (`aria-pressed` = pinned) whose `aria-controls` points at
 * the inspector. Toggle buttons fit because pinning is optional and reversible, at most one
 * part is pinned, and the figure has a neutral rest state. A tablist would force one selected
 * tab and announce "tab 1 of 3", which misdescribes a top-to-bottom flow; a listbox implies
 * picking a value for a form. The parts share one Tab stop (roving tabindex): arrow keys, Home
 * and End move in reading order (nodes, with the modules right after their node). Pin changes
 * are announced through a polite status region; previews are not, so hovering stays silent.
 *
 * Without JavaScript the buttons do nothing, and CSS lists every node's description under the
 * drawing in place of the inspector (also when printing). See styles/architecture.css.
 */

type StyleVars = CSSProperties & Record<`--${string}`, number | string>;

/** A part of the drawing: `n<i>` is node i (top to bottom), `m<k>` is module k of the middle node. */
type PartKey = `n${number}` | `m${number}`;
type PartState = "active" | "linked" | "dim";

export interface ExplorerNode {
  label: string;
  detail: string;
  description?: string;
}

interface ArchitectureExplorerProps {
  /** Prefixes the inspector id and identifies Technical DNA links to this project. */
  projectId: string;
  /** The project's number ("01"), shown as "fig.01" in the header. */
  figureIndex: string;
  nodes: ExplorerNode[];
  /** Server-rendered node icons, in node order, so the icon set stays out of the client bundle. */
  icons: ReactNode[];
  /** Modules of the middle node. */
  modules: string[];
  /** For each stack technology, the indexes of the nodes that name it. */
  stackMatches: Record<string, number[]>;
}

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** Grace period before a hover preview ends, so crossing the gap between parts doesn't flicker. */
const HOVER_RELEASE_MS = 90;
/** How long a touched stack chip keeps its nodes lit after the finger lifts. */
const CHIP_TOUCH_LINGER_MS = 500;
/**
 * Touch press flash: it waits a moment so a scroll that starts on a part doesn't flash it, then
 * stays on for at least PRESS_MIN_MS so a quick tap is still seen.
 */
const PRESS_DELAY_MS = 50;
const PRESS_MIN_MS = 150;
/**
 * Data flow: one cycle lights the nodes from top to bottom with a pulse running down each
 * connector (styles/architecture.css; its keyframe percentages assume this cycle). It plays
 * when the diagram comes into view, on every device, and keeps playing while a mouse rests on
 * the card.
 */
const FLOW_CYCLE_MS = 2400;
/** Time between two nodes lighting up. */
const FLOW_GAP_MS = 420;
/** Cycles played on arrival (and per replay): under five seconds, so it never needs a pause control. */
const FLOW_ENTRY_RUNS = 2;
/** Lets the entrance (nodes appearing one by one) settle before the first light. */
const FLOW_ENTRY_DELAY_MS = 700;
const CLEARED = "Selection cleared.";
const HINT = "Select a part of the diagram to see what it does in this project.";

const partIndex = (key: PartKey) => Number(key.slice(1));

function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible");
  } catch {
    // No :focus-visible support: treat every focus as keyboard focus.
    return true;
  }
}

/** Moves focus back to a part without scrolling and without starting a focus preview. */
function focusQuietly(control: HTMLElement | undefined, skipPreview: { current: boolean }) {
  if (!control) return;
  skipPreview.current = true;
  try {
    control.focus({ preventScroll: true });
  } finally {
    skipPreview.current = false;
  }
}

/**
 * Touch press feedback on a part: `data-pressed` after a short delay (cancelled if the touch
 * turns into a scroll), kept for at least PRESS_MIN_MS once the finger lifts. Touch pointers
 * are captured by their target, so pointerup and pointercancel arrive here; a pen lifting
 * elsewhere ends with pointerleave instead.
 */
function pressFeedback(element: HTMLElement) {
  const downAt = performance.now();
  let shown = false;
  let showTimer: number | undefined = window.setTimeout(() => {
    showTimer = undefined;
    shown = true;
    element.setAttribute("data-pressed", "");
  }, PRESS_DELAY_MS);

  const release = (event: globalThis.PointerEvent) => {
    element.removeEventListener("pointerup", release);
    element.removeEventListener("pointercancel", release);
    element.removeEventListener("pointerleave", release);
    if (showTimer !== undefined) {
      window.clearTimeout(showTimer);
      // A scroll never shows the flash; a very quick tap shows it now.
      if (event.type === "pointercancel") return;
      shown = true;
      element.setAttribute("data-pressed", "");
    }
    if (!shown) return;
    const left = Math.max(0, PRESS_MIN_MS - (performance.now() - downAt));
    window.setTimeout(() => element.removeAttribute("data-pressed"), left);
  };
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
  element.addEventListener("pointerleave", release);
}

export function ArchitectureExplorer({
  projectId,
  figureIndex,
  nodes,
  icons,
  modules,
  stackMatches,
}: ArchitectureExplorerProps) {
  const inspectorId = `arch-${projectId}-inspector`;
  const middle = Math.floor((nodes.length - 1) / 2);
  const parent = nodes[middle];
  const hasModules = modules.length > 0;
  const modulesSlot = nodes.length * 2 - 1;

  /** Reading order of the parts, for the arrow keys. */
  const order: PartKey[] = nodes.flatMap((_, i): PartKey[] =>
    hasModules && i === middle ? [`n${i}`, ...modules.map((_, k): PartKey => `m${k}`)] : [`n${i}`],
  );

  const canvasRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);
  const controls = useRef(new Map<PartKey, HTMLButtonElement>());
  const canHover = useRef(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  /** Set while focus is moved back by script, so it doesn't start a preview. */
  const skipPreview = useRef(false);
  /** Starts FLOW_ENTRY_RUNS cycles of the data flow; set by the data-flow effect. */
  const replayRef = useRef<() => void>(() => {});
  /** Re-syncs the flow's phase after CSS restarted it (see the data-flow effect). */
  const resyncRef = useRef<() => void>(() => {});

  const [hoverKey, setHoverKey] = useState<PartKey | null>(null);
  const [focusKey, setFocusKey] = useState<PartKey | null>(null);
  const [pinnedKey, setPinnedKey] = useState<PartKey | null>(null);
  /** The part focused or pressed last: the drawing's single Tab stop. */
  const [tabStop, setTabStop] = useState<PartKey>("n0");
  /** A stack technology previewed from a chip, or brought in by a Technical DNA link. */
  const [chipTerm, setChipTerm] = useState<string | null>(null);
  const [arrivalTerm, setArrivalTerm] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [flowing, setFlowing] = useState(false);
  /** The replay button's icon turns once per press (cleared when its animation ends). */
  const [spinning, setSpinning] = useState(false);
  /** Reduced motion: no flow to replay, so the header shows a plain label (false on the server). */
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  /* ---------- Derived state ---------- */
  const activeKey = focusKey ?? hoverKey ?? pinnedKey;
  const activeNode = activeKey?.startsWith("n") ? partIndex(activeKey) : null;
  const activeModule = activeKey?.startsWith("m") ? partIndex(activeKey) : null;
  const matchTerm = chipTerm ?? arrivalTerm;
  const matched = new Set(matchTerm ? (stackMatches[matchTerm] ?? []) : []);

  const nodeState = (i: number): PartState | undefined => {
    if (activeKey === null) return undefined;
    // A module is active: its node is linked, the others rest dimmed.
    if (activeNode === null) return i === middle ? "linked" : "dim";
    if (i === activeNode) return "active";
    return Math.abs(i - activeNode) === 1 ? "linked" : "dim";
  };

  const moduleState = (k: number): PartState | undefined => {
    if (activeKey === null) return undefined;
    if (k === activeModule) return "active";
    return activeNode === middle ? "linked" : "dim";
  };

  /**
   * Connector `j` joins node j - 1 to node j. Lit when it touches the active node, or joins two
   * nodes lit by a stack chip. The value orders the pulses: 0 runs first, 1 right after.
   */
  const linkOrder = (j: number): number | undefined => {
    if (activeNode !== null) {
      if (j === activeNode) return 0;
      if (j === activeNode + 1) return activeNode > 0 ? 1 : 0;
    }
    if (matched.has(j - 1) && matched.has(j)) return 0;
    return undefined;
  };

  /** The branch to the modules: lit while the middle node or one of its modules is active. */
  const branchOrder = activeModule !== null ? 0 : activeNode === middle ? (middle > 0 ? 1 : 0) : undefined;

  /** What the status region says when a part is pinned. */
  const describe = (key: PartKey): string => {
    const index = partIndex(key);
    if (key.startsWith("m")) return `${modules[index]}, module of the ${parent.label}.`;
    const node = nodes[index];
    return `${node.label}, ${spoken(node.detail)}.${node.description ? ` ${node.description}` : ""}`;
  };

  /* ---------- Pointer capability ---------- */
  // Hover previews are information, not decoration, so only the pointer type gates them
  // (reduced motion keeps them; the pulse is what reduced motion removes, in CSS).
  useEffect(() => {
    const query = window.matchMedia(HOVER_QUERY);
    const update = () => {
      canHover.current = query.matches;
    };
    update();
    query.addEventListener("change", update);
    const timer = hoverTimer;
    return () => {
      query.removeEventListener("change", update);
      window.clearTimeout(timer.current);
    };
  }, []);

  /* ---------- Data flow ---------- */
  // Plays FLOW_ENTRY_RUNS cycles each time the diagram comes into view or the header button is
  // pressed, and loops while a mouse rests on the card. It always stops at the end of a cycle,
  // so no light is cut off mid-way. CSS pauses it while a part is inspected and leaves it out
  // entirely with reduced motion.
  useEffect(() => {
    const canvas = canvasRef.current;
    const card = canvas?.closest("article");
    if (!canvas || !card) return;
    const reduce = window.matchMedia(REDUCED_MOTION_QUERY);
    let startedAt = 0;
    let hovered = false;
    let inView = false;
    let startTimer: number | undefined;
    let stopTimer: number | undefined;
    let stopPending = false;

    const start = () => {
      window.clearTimeout(stopTimer);
      stopPending = false;
      if (reduce.matches || startedAt !== 0) return;
      startedAt = performance.now();
      setFlowing(true);
    };
    /** Stops at the end of the cycle in progress, after `extraRuns` more whole cycles. */
    const stopAfter = (extraRuns: number) => {
      window.clearTimeout(stopTimer);
      if (startedAt === 0) return;
      const left = FLOW_CYCLE_MS - ((performance.now() - startedAt) % FLOW_CYCLE_MS) + extraRuns * FLOW_CYCLE_MS;
      stopPending = true;
      stopTimer = window.setTimeout(() => {
        stopPending = false;
        startedAt = 0;
        setFlowing(false);
      }, left);
    };
    const stopNow = () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(stopTimer);
      stopPending = false;
      startedAt = 0;
      setFlowing(false);
    };

    // Replay: two cycles from the current one (more while already flowing). A resting mouse
    // keeps its own loop, so the stop is only scheduled when nothing else holds the flow.
    replayRef.current = () => {
      window.clearTimeout(startTimer);
      start();
      if (!hovered) stopAfter(FLOW_ENTRY_RUNS - 1);
    };

    // CSS drops the flow while a part is inspected or a chip highlights nodes and restarts it
    // from cycle 0 afterwards: take that restart as the new phase, so a pending stop still
    // lands on a cycle end.
    resyncRef.current = () => {
      if (startedAt === 0) return;
      startedAt = performance.now();
      if (stopPending) stopAfter(0);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio >= 0.6 && !inView) {
          inView = true;
          window.clearTimeout(startTimer);
          startTimer = window.setTimeout(() => {
            if (hovered || startedAt !== 0) return;
            start();
            stopAfter(FLOW_ENTRY_RUNS - 1);
          }, FLOW_ENTRY_DELAY_MS);
        } else if (!entry.isIntersecting && inView) {
          inView = false;
          stopNow();
        }
      },
      { threshold: [0, 0.6] },
    );
    observer.observe(canvas);

    const onEnter = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      hovered = true;
      window.clearTimeout(startTimer);
      start();
    };
    const onLeave = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse" || !hovered) return;
      hovered = false;
      stopAfter(0);
    };
    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointerleave", onLeave);

    return () => {
      observer.disconnect();
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      window.clearTimeout(startTimer);
      window.clearTimeout(stopTimer);
      replayRef.current = () => {};
      resyncRef.current = () => {};
    };
  }, []);

  const flowPaused = activeKey !== null || matched.size > 0;
  useEffect(() => {
    if (!flowPaused) resyncRef.current();
  }, [flowPaused]);

  /* ---------- Escape clears ---------- */
  const engaged = pinnedKey !== null || focusKey !== null;
  useEffect(() => {
    if (!engaged) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Leave Escape to the command palette, the mobile menu and form fields.
      if (document.querySelector("dialog[open], #mobile-menu[data-open]")) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('dialog, [role="dialog"], [aria-modal="true"], input, textarea, select')) return;
      setFocusKey(null);
      if (pinnedKey === null) return;
      // The Clear button is about to disappear; don't strand focus on it.
      const focusInInspector = inspectorRef.current?.contains(document.activeElement) ?? false;
      setPinnedKey(null);
      setAnnouncement(CLEARED);
      if (focusInInspector) {
        requestAnimationFrame(() => focusQuietly(controls.current.get(pinnedKey), skipPreview));
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [engaged, pinnedKey]);

  /* ---------- Stack chips in the same card preview the nodes that use them ---------- */
  // Mouse: while hovering. Keyboard: while focused. Touch or pen: from the press until half a
  // second after the finger lifts (the link still navigates; nothing is prevented).
  useEffect(() => {
    const canvas = canvasRef.current;
    const card = canvas?.closest("article");
    const figure = canvas?.closest("figure");
    if (!card) return;
    let timer: number | undefined;

    const chipOf = (target: EventTarget | null): HTMLElement | null => {
      if (!(target instanceof Element)) return null;
      const chip = target.closest<HTMLElement>(`a[${SKILL_LINK_ATTR}]`);
      return chip && card.contains(chip) && !figure?.contains(chip) ? chip : null;
    };
    const show = (chip: HTMLElement) => {
      window.clearTimeout(timer);
      setChipTerm(chip.getAttribute(SKILL_LINK_ATTR));
    };
    const hide = (after = HOVER_RELEASE_MS) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setChipTerm(null), after);
    };

    const onPointerOver = (event: globalThis.PointerEvent) => {
      const chip = event.pointerType === "mouse" && canHover.current ? chipOf(event.target) : null;
      if (chip) show(chip);
    };
    const onPointerOut = (event: globalThis.PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const chip = chipOf(event.target);
      if (chip && !(event.relatedTarget instanceof Node && chip.contains(event.relatedTarget))) hide();
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "mouse") return;
      const chip = chipOf(event.target);
      if (!chip) return;
      show(chip);
      const lift = () => {
        chip.removeEventListener("pointerup", lift);
        chip.removeEventListener("pointercancel", lift);
        chip.removeEventListener("pointerleave", lift);
        hide(CHIP_TOUCH_LINGER_MS);
      };
      chip.addEventListener("pointerup", lift);
      chip.addEventListener("pointercancel", lift);
      chip.addEventListener("pointerleave", lift);
    };
    const onFocusIn = (event: globalThis.FocusEvent) => {
      const chip = chipOf(event.target);
      if (chip && isFocusVisible(chip)) show(chip);
    };
    const onFocusOut = (event: globalThis.FocusEvent) => {
      if (chipOf(event.target)) hide();
    };

    card.addEventListener("pointerover", onPointerOver);
    card.addEventListener("pointerout", onPointerOut);
    card.addEventListener("pointerdown", onPointerDown, { passive: true });
    card.addEventListener("focusin", onFocusIn);
    card.addEventListener("focusout", onFocusOut);
    return () => {
      card.removeEventListener("pointerover", onPointerOver);
      card.removeEventListener("pointerout", onPointerOut);
      card.removeEventListener("pointerdown", onPointerDown);
      card.removeEventListener("focusin", onFocusIn);
      card.removeEventListener("focusout", onFocusOut);
      window.clearTimeout(timer);
    };
  }, []);

  /* ---------- Arriving from the Technical DNA ---------- */
  // A DNA "Used in" link to this project that names its skill lights that technology here.
  useEffect(() => {
    const anchor = `#${projectAnchor(projectId)}`;
    const terms = Object.keys(stackMatches);
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>(`a[${FROM_SKILL_ATTR}]`);
      if (!link || link.hash !== anchor) return;
      const skill = link.getAttribute(FROM_SKILL_ATTR) ?? "";
      setArrivalTerm(terms.find((term) => term === skill) ?? terms.find((term) => sameTech(term, skill)) ?? null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [projectId, stackMatches]);

  // The matching stack chip is marked too. Both fade with the visitor's next click, tap or key
  // (not on touch-scrolling, which starts with a pointerdown).
  useEffect(() => {
    if (!arrivalTerm) return;
    const card = canvasRef.current?.closest("article");
    const chips = Array.from(card?.querySelectorAll<HTMLElement>(`a[${SKILL_LINK_ATTR}]`) ?? []).filter(
      (chip) => chip.getAttribute(SKILL_LINK_ATTR) === arrivalTerm,
    );
    chips.forEach((chip) => chip.setAttribute("data-match", ""));
    const end = () => setArrivalTerm(null);
    document.addEventListener("click", end);
    document.addEventListener("keydown", end);
    return () => {
      chips.forEach((chip) => chip.removeAttribute("data-match"));
      document.removeEventListener("click", end);
      document.removeEventListener("keydown", end);
    };
  }, [arrivalTerm]);

  /* ---------- Handlers ---------- */
  /** While focus is inside the inspector, hold the pinned panel so its Clear button can't vanish. */
  const onInspectorFocus = () => {
    if (pinnedKey !== null) setFocusKey(pinnedKey);
  };
  const onInspectorBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    setFocusKey(null);
  };

  const onPointerEnter = (event: PointerEvent<HTMLButtonElement>, key: PartKey) => {
    if (event.pointerType !== "mouse" || !canHover.current) return;
    window.clearTimeout(hoverTimer.current);
    setHoverKey(key);
  };

  const onPointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoverKey(null), HOVER_RELEASE_MS);
  };

  /** Touch and pen presses flash the part (a mouse already has its hover preview). */
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") return;
    pressFeedback(event.currentTarget);
  };

  const onFocus = (event: FocusEvent<HTMLButtonElement>, key: PartKey) => {
    setTabStop(key);
    // A click focuses the button too, but the click pins; only keyboard focus previews.
    if (skipPreview.current || !isFocusVisible(event.currentTarget)) return;
    setFocusKey(key);
  };

  const onBlur = (key: PartKey) => setFocusKey((current) => (current === key ? null : current));

  const toggle = (key: PartKey) => {
    const next = pinnedKey === key ? null : key;
    setTabStop(key);
    setArrivalTerm(null);
    setPinnedKey(next);
    setAnnouncement(next ? describe(next) : CLEARED);
  };

  const clear = () => {
    const key = pinnedKey;
    setPinnedKey(null);
    setFocusKey(null);
    setAnnouncement(CLEARED);
    // The Clear button disappears with the pin: put focus back on the part it released.
    if (key) requestAnimationFrame(() => focusQuietly(controls.current.get(key), skipPreview));
  };

  /** The header button: the flow is what the visitor asked for, so a pinned part is released. */
  const replay = () => {
    setSpinning(true);
    if (pinnedKey !== null) {
      setPinnedKey(null);
      setAnnouncement(CLEARED);
    }
    replayRef.current();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLOListElement>) => {
    const current = event.target instanceof HTMLElement ? (event.target.dataset.part as PartKey | undefined) : undefined;
    if (!current) return;
    const index = order.indexOf(current);
    const last = order.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = Math.min(index + 1, last);
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = Math.max(index - 1, 0);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    controls.current.get(order[next])?.focus();
  };

  /** Props shared by every part's toggle button. */
  const partProps = (key: PartKey) => ({
    ref: (element: HTMLButtonElement | null) => {
      if (element) controls.current.set(key, element);
      else controls.current.delete(key);
    },
    type: "button" as const,
    "data-part": key,
    tabIndex: key === tabStop ? 0 : -1,
    "aria-pressed": pinnedKey === key,
    "aria-controls": inspectorId,
    onClick: () => toggle(key),
    onFocus: (event: FocusEvent<HTMLButtonElement>) => onFocus(event, key),
    onBlur: () => onBlur(key),
    onPointerEnter: (event: PointerEvent<HTMLButtonElement>) => onPointerEnter(event, key),
    onPointerLeave,
    onPointerDown,
  });

  return (
    <>
      {/* Header. "Architecture" replays the data flow (the visible text is in its name, for
          "label in name"); "fig.01" is decorative, the figcaption carries the content. */}
      <div className="flex items-center justify-between gap-4 border-b border-line px-4 sm:px-5">
        {reducedMotion ? (
          <span className="label-mono py-2.5">Architecture</span>
        ) : (
          <button
            type="button"
            onClick={replay}
            aria-label="Architecture, replay data flow"
            data-flowing={flowing ? "" : undefined}
            className="arch-replay label-mono -ml-2 inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-left transition-colors duration-200 ease-out-quart hover:text-fg focus-visible:text-fg active:text-fg pointer-coarse:min-h-11"
          >
            Architecture
            <RotateCcw
              aria-hidden="true"
              focusable="false"
              data-spin={spinning ? "" : undefined}
              onAnimationEnd={() => setSpinning(false)}
              className="arch-replay-icon size-3.5"
            />
          </button>
        )}
        <span aria-hidden="true" className="label-mono py-2.5">
          fig.{figureIndex}
        </span>
      </div>

      <div
        ref={canvasRef}
        data-inspecting={activeKey !== null ? "" : undefined}
        data-flowing={flowing ? "" : undefined}
        className="arch-canvas @container/arch relative flex flex-1 items-center px-3.5 py-8 sm:px-6 sm:py-10"
        style={{ "--arch-cycle": `${FLOW_CYCLE_MS}ms`, "--arch-gap": `${FLOW_GAP_MS}ms` } as StyleVars}
      >
        <ol
          aria-label="Diagram parts, use arrow keys to move"
          data-modules={hasModules ? "" : undefined}
          className="arch-flow mx-auto w-full"
          onKeyDown={onKeyDown}
        >
          {nodes.map((node, i) => {
            const withModules = hasModules && i === middle;
            const lit = i > 0 ? linkOrder(i) : undefined;
            return (
              <li key={`${node.label}-${i}`} className="arch-step" style={{ "--i": i } as StyleVars}>
                {i > 0 ? (
                  <span
                    aria-hidden="true"
                    className="arch-link"
                    data-lit={lit !== undefined ? "" : undefined}
                    style={{ "--s": i * 2 - 1, "--o": lit ?? 0 } as StyleVars}
                  >
                    <span className="arch-line" />
                    <span className="arch-pulse" />
                    <svg className="arch-head" viewBox="0 0 9 6" width="9" height="6" focusable="false">
                      <path d="M0 0h9L4.5 6z" fill="currentColor" />
                    </svg>
                  </span>
                ) : null}

                <div className="arch-row">
                  <button
                    {...partProps(`n${i}`)}
                    data-state={nodeState(i)}
                    data-match={matched.has(i) ? "" : undefined}
                    data-has-mods={withModules ? "" : undefined}
                    className="arch-node flex items-center gap-3 rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-left @md/arch:gap-3.5 @md/arch:px-4 @md/arch:py-3"
                    style={{ "--s": i * 2 } as StyleVars}
                  >
                    <span
                      aria-hidden="true"
                      className="arch-icon grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-tint/[0.04] text-accent @md/arch:size-9"
                    >
                      {icons[i]}
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="label-mono">{node.label}</span>
                      <span className="sr-only">: {spoken(node.detail)}</span>
                      <span
                        aria-hidden="true"
                        className="arch-detail font-display text-[0.9375rem] leading-snug font-medium tracking-[-0.01em] break-words text-fg @md/arch:text-[1.0625rem]"
                      >
                        {node.detail}
                      </span>
                    </span>
                  </button>

                  {withModules ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="arch-branch"
                        data-lit={branchOrder !== undefined ? "" : undefined}
                        style={{ "--s": modulesSlot, "--o": branchOrder ?? 0 } as StyleVars}
                      >
                        <span className="arch-branch-pulse" />
                      </span>
                      <div className="arch-mods" style={{ "--s": i * 2, "--m": modulesSlot } as StyleVars}>
                        <span aria-hidden="true" className="label-mono block">
                          Modules
                        </span>
                        <ul aria-label={`${node.label} modules`} className="arch-chips">
                          {modules.map((module, k) => (
                            <li key={module}>
                              <button
                                {...partProps(`m${k}`)}
                                data-state={moduleState(k)}
                                className="arch-chip inline-flex min-h-8 items-center rounded-md border border-dashed border-line-strong bg-surface px-2.5 py-1 text-left font-mono text-xs leading-tight text-fg-muted pointer-coarse:min-h-11"
                                style={{ "--k": k } as StyleVars}
                              >
                                {module}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div
        ref={inspectorRef}
        id={inspectorId}
        onFocus={onInspectorFocus}
        onBlur={onInspectorBlur}
        className="arch-inspector border-t border-line px-4 py-4 sm:px-5">
        <div className="arch-panels">
          <div className="arch-panel js-only" data-kind="rest" data-shown={activeKey === null ? "" : undefined}>
            <p className="max-w-[52ch] text-sm leading-relaxed text-fg-muted">{HINT}</p>
          </div>
          {nodes.map((node, i) => (
            <InspectorPanel
              key={`${node.label}-${i}`}
              kind="node"
              shown={activeKey === `n${i}`}
              eyebrow={node.label}
              title={node.detail}
              text={node.description}
              onClear={pinnedKey === `n${i}` ? clear : undefined}
            />
          ))}
          {modules.map((module, k) => (
            <InspectorPanel
              key={module}
              kind="module"
              shown={activeKey === `m${k}`}
              eyebrow="Module"
              title={module}
              text={`Module of the ${parent.label}.`}
              onClear={pinnedKey === `m${k}` ? clear : undefined}
            />
          ))}
        </div>
      </div>

      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

interface InspectorPanelProps {
  kind: "node" | "module";
  shown: boolean;
  eyebrow: string;
  title: string;
  text?: string;
  /** Set while this part is pinned: shows the Clear button. */
  onClear?: () => void;
}

/**
 * One part's details. Every panel shares one grid cell, so the inspector is always as tall as
 * its longest panel and never jumps; only the shown one is visible (and read by screen readers).
 */
function InspectorPanel({ kind, shown, eyebrow, title, text, onClear }: InspectorPanelProps) {
  return (
    <div className="arch-panel" data-kind={kind} data-shown={shown ? "" : undefined}>
      <div className="flex min-h-7 items-center justify-between gap-3">
        <p className="label-mono">{eyebrow}</p>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="arch-clear relative inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line px-2 font-mono text-xs text-fg-muted transition-[color,border-color,scale] duration-150 ease-out-quart after:absolute after:inset-x-0 after:-inset-y-2 hover:border-line-strong hover:text-fg focus-visible:border-line-strong focus-visible:text-fg active:scale-[0.98]"
          >
            <X aria-hidden="true" className="size-3.5" />
            Clear<span className="sr-only"> selection</span>
          </button>
        ) : null}
      </div>
      <p className="mt-1 font-display text-[1.0625rem] leading-snug font-semibold tracking-[-0.01em] text-fg">
        {title.includes(" · ") ? (
          <>
            <span aria-hidden="true">{title}</span>
            <span className="sr-only">{spoken(title)}</span>
          </>
        ) : (
          title
        )}
      </p>
      {text ? <p className="mt-1.5 max-w-[56ch] text-[0.9375rem] leading-relaxed text-fg-muted">{text}</p> : null}
    </div>
  );
}
