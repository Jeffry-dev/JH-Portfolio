"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ArrowDownRight, CodeXml, Database, Server, UserRound, Workflow, X, type LucideIcon } from "lucide-react";
import type { DnaDomain, DnaDomainId, DnaGroup, DnaNode, TechDnaGraph } from "@/data/tech-dna";
import { cn } from "@/lib/utils";

/**
 * Technical DNA: the skills as one connected system.
 *
 * Server-rendered as plain, readable markup (hub, four domains, every skill).
 * On the client it becomes an explorer: hovering (fine pointer), focusing or tapping a
 * skill highlights what it was used with, and on desktop an SVG layer draws the
 * hub-to-domain wiring plus curved links for the active skill. The info panel
 * explains each selection in words, so nothing depends on the lines or on color.
 *
 * Keyboard: the chips are one Tab stop (roving tabindex). Arrow keys move between them,
 * Enter or Space pins, Tab continues into the info panel, Escape clears. Keyboard focus
 * always outranks mouse hover. Each chip also carries a short static description, so
 * nothing has to be announced live.
 */

interface TechDnaProps {
  graph: TechDnaGraph;
  hub: { name: string; title: string };
}

type NodeState = "idle" | "active" | "linked" | "peer" | "dim";
type DomainState = "idle" | "active" | "linked" | "dim";
type PanelMode = "rest" | "preview" | "pinned";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A desktop lane (one column of chips under a tree spine), measured. */
interface LaneBox {
  /** x of the lane's tree spine. */
  spine: number;
  /** Top-most and bottom-most chip centers, so arcs can scale with the lane's height. */
  top: number;
  bottom: number;
}

interface Geometry {
  width: number;
  height: number;
  hub: Box | null;
  heads: Partial<Record<DnaDomainId, Box>>;
  nodes: Record<string, Box>;
  lanes: Record<number, LaneBox>;
}

const GROUP_LABEL = "Skills, use arrow keys to move";
const DESKTOP_QUERY = "(min-width: 64rem)";
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** Grace period before a hover preview ends, so crossing the gap between chips doesn't flicker. */
const HOVER_RELEASE_MS = 90;

const domainIcons: Record<DnaDomainId, LucideIcon> = {
  systems: Server,
  software: CodeXml,
  data: Database,
  workflow: Workflow,
};

const nodeDomId = (id: string) => `dna-node-${id}`;
const nodeDescriptionId = (id: string) => `dna-desc-${id}`;
const domainHeadingId = (id: string) => `dna-domain-${id}`;
const groupHeadingId = (id: string) => `dna-group-${id}`;
const round = (value: number) => Math.round(value * 10) / 10;

/** "A", "A and B", "A, B and C" */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Static screen reader description of a chip: where it is used and how many links it has. */
function describeNode(node: DnaNode): string {
  const count = node.connections.length;
  const used = node.usedIn.length > 0 ? `Used in ${joinNames(node.usedIn)}. ` : "";
  return `${used}${count > 0 ? `Connected to ${count} ${count === 1 ? "skill" : "skills"}.` : "Not linked to other skills."}`;
}

/** Moves focus back to a chip without scrolling and without starting a focus preview. */
function returnFocus(id: string, skipPreview: { current: boolean }) {
  requestAnimationFrame(() => {
    const chip = document.getElementById(nodeDomId(id));
    if (!chip) return;
    skipPreview.current = true;
    try {
      chip.focus({ preventScroll: true });
    } finally {
      skipPreview.current = false;
    }
  });
}

/** Hub (bottom center) to a domain header (top center): a soft S-curve. */
function hubPath(hub: Box, head: Box): string {
  const x1 = hub.x + hub.w / 2;
  const y1 = hub.y + hub.h;
  const x2 = head.x + head.w / 2;
  const y2 = head.y;
  const k = (y2 - y1) * 0.6;
  return `M${round(x1)} ${round(y1)}C${round(x1)} ${round(y1 + k)} ${round(x2)} ${round(y2 - k)} ${round(x2)} ${round(y2)}`;
}

type Cubic = [number, number, number, number, number, number, number, number];

const cubicPath = (c: Cubic) =>
  `M${round(c[0])} ${round(c[1])}C${round(c[2])} ${round(c[3])} ${round(c[4])} ${round(c[5])} ${round(c[6])} ${round(c[7])}`;

/** How many sampled points of the curve fall on other chips (or rise into the headers). */
function crossings(c: Cubic, obstacles: Box[], ceiling: number): number {
  let hits = 0;
  for (let i = 1; i < 32; i++) {
    const t = i / 32;
    const mt = 1 - t;
    const k0 = mt * mt * mt;
    const k1 = 3 * mt * mt * t;
    const k2 = 3 * mt * t * t;
    const k3 = t * t * t;
    const x = k0 * c[0] + k1 * c[2] + k2 * c[4] + k3 * c[6];
    const y = k0 * c[1] + k1 * c[3] + k2 * c[5] + k3 * c[7];
    if (y < ceiling + 4) {
      hits += 4;
      continue;
    }
    for (const box of obstacles) {
      if (x > box.x - 2 && x < box.x + box.w + 2 && y > box.y - 2 && y < box.y + box.h + 2) {
        hits++;
        break;
      }
    }
  }
  return hits;
}

/** Vertical bows tried for a cross-lane link, smallest first. */
const LIFTS = [0, -8, 8, -16, 16, -24, 24, -32, 32, -44, 44, -56, 56];

/**
 * Link from the active chip to a chip in another lane.
 * Leaves the facing edge and lands on the target's facing edge. Of a few vertical bows, it
 * keeps the one that passes behind the fewest other chips, so a line never seems to come
 * out of a skill it isn't connected to.
 * `ceiling` is the bottom of the domain headers; links never rise into them.
 */
function linkPath(a: Box, b: Box, laneA: number, laneB: number, obstacles: Box[], ceiling: number): string {
  const y1 = a.y + a.h / 2;
  const y2 = b.y + b.h / 2;
  const dir = laneB > laneA ? 1 : -1;
  const x1 = dir > 0 ? a.x + a.w : a.x;
  const x2 = dir > 0 ? b.x : b.x + b.w;
  const bend = Math.max(32, Math.abs(x2 - x1) * 0.45);

  let best: Cubic | null = null;
  let fewest = Infinity;
  for (const lift of LIFTS) {
    const curve: Cubic = [x1, y1, x1 + dir * bend, y1 + lift, x2 - dir * bend, y2 + lift, x2, y2];
    const hits = crossings(curve, obstacles, ceiling);
    if (hits < fewest) {
      best = curve;
      fewest = hits;
      if (hits === 0) break;
    }
  }
  return cubicPath(best ?? [x1, y1, x1 + dir * bend, y1, x2 - dir * bend, y2, x2, y2]);
}

/** Clearance past the spine (left) or the spanned chips (right) for the shortest arc. */
const ARC_CLEARANCE = 9;
/** Extra bow, at most, for an arc that spans the whole lane. */
const ARC_RANGE = 36;
/** Arcs stop this far short of the graph edge or the next lane's spine. */
const ARC_MARGIN = 6;

type ArcSide = "left" | "right";

/**
 * Link between two chips in the same lane: a short arc on the lane's outer side, so it never
 * crosses the chips in between. The first lane bows left, past its spine into the margin;
 * the other lanes bow right, past the widest chip the arc spans. The bow grows with the
 * distance covered, so several links from one chip nest like an arc diagram.
 * `edge` is the outermost chip edge the arc passes; `limit` is how far out it may reach.
 */
function arcPath(a: Box, b: Box, side: ArcSide, lane: LaneBox, edge: number, limit: number): string {
  const y1 = a.y + a.h / 2;
  const y2 = b.y + b.h / 2;
  const t = Math.min(1, Math.abs(y2 - y1) / Math.max(1, lane.bottom - lane.top));
  const left = side === "left";
  const x1 = left ? a.x : a.x + a.w;
  const x2 = left ? b.x : b.x + b.w;
  const start = left ? Math.min(lane.spine, edge) - ARC_CLEARANCE : edge + ARC_CLEARANCE;
  const range = Math.min(ARC_RANGE, Math.max(0, left ? start - limit : limit - start));
  const peak = left ? start - range * t : start + range * t;
  // A cubic with both control points at cx peaks at 0.125 * (x1 + x2) + 0.75 * cx.
  const cx = (peak - 0.125 * (x1 + x2)) / 0.75;
  return cubicPath([x1, y1, cx, y1, cx, y2, x2, y2]);
}

/** Layout box relative to `container`, from offsets so entrance transforms don't skew it. */
function boxWithin(element: HTMLElement, container: HTMLElement): Box {
  let x = element.offsetLeft;
  let y = element.offsetTop;
  let parent = element.offsetParent;
  while (parent instanceof HTMLElement && parent !== container) {
    x += parent.offsetLeft + parent.clientLeft;
    y += parent.offsetTop + parent.clientTop;
    parent = parent.offsetParent;
  }
  return { x, y, w: element.offsetWidth, h: element.offsetHeight };
}

interface LaneLayout {
  index: number;
  groups: DnaGroup[];
}

interface DomainLayout extends DnaDomain {
  order: number;
  trackStart: number;
  /** 2 = spans both desktop rows; 1 = shares its tracks with the info panel below it. */
  rows: number;
  laneLayouts: LaneLayout[];
  nodeIds: string[];
  /** Entrance order of each row (group labels keyed `group:<id>`, technologies by node id). */
  rowOrder: Record<string, number>;
}

/** Entrance delay for a row: after the hub and headers, a quick cascade per domain. */
const rowDelay = (domainOrder: number, row: number) => `${240 + domainOrder * 50 + Math.min(row, 14) * 18}ms`;

/** Desktop grid placement, lane membership and entrance order, derived from the data. Pure. */
function computeLayout(graph: TechDnaGraph) {
  const totalTracks = graph.domains.reduce((total, domain) => total + domain.lanes.length, 0);
  // The info panel sits under the right-most domains on desktop.
  const panelSpan = Math.min(2, totalTracks);
  const panelStart = totalTracks - panelSpan;
  const laneOf: Record<string, number> = {};
  /** Node ids per lane, top to bottom. */
  const laneNodes: Record<number, string[]> = {};
  const domains: DomainLayout[] = [];
  let track = 0;

  graph.domains.forEach((domain, order) => {
    const trackStart = track;
    track += domain.lanes.length;
    const groupsById = new Map(domain.groups.map((group) => [group.id, group]));
    const laneLayouts = domain.lanes.map((groupIds, offset) => {
      const index = trackStart + offset;
      const groups = groupIds
        .map((id) => groupsById.get(id))
        .filter((group): group is DnaGroup => Boolean(group));
      for (const group of groups) {
        for (const id of group.nodeIds) {
          laneOf[id] = index;
          (laneNodes[index] ??= []).push(id);
        }
      }
      return { index, groups };
    });

    const multiGroup = domain.groups.length > 1;
    const rowOrder: Record<string, number> = {};
    let row = 0;
    for (const lane of laneLayouts) {
      for (const group of lane.groups) {
        if (multiGroup) rowOrder[`group:${group.id}`] = row++;
        for (const id of group.nodeIds) rowOrder[id] = row++;
      }
    }

    domains.push({
      ...domain,
      order,
      trackStart,
      rows: trackStart + domain.lanes.length > panelStart ? 1 : 2,
      laneLayouts,
      nodeIds: laneLayouts.flatMap((lane) => lane.groups.flatMap((group) => group.nodeIds)),
      rowOrder,
    });
  });

  const nodeCount = domains.reduce((total, domain) => total + domain.size, 0);
  /** Lanes that hold chips, left to right. */
  const lanes = Object.keys(laneNodes)
    .map(Number)
    .sort((a, b) => a - b);
  const firstId = domains[0]?.nodeIds[0] ?? null;
  return { domains, totalTracks, panelStart, panelSpan, laneOf, laneNodes, lanes, nodeCount, firstId };
}

export function TechDna({ graph, hub }: TechDnaProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const canHover = useRef(false);
  /** True from a keyboard focus or key press until the mouse really moves over a chip again. */
  const keyboardMode = useRef(false);
  /** Last mouse position seen over a chip, to tell real movement from content scrolling under it. */
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  /** Set while focus is returned to a chip by script, so that focus doesn't start a preview. */
  const skipPreview = useRef(false);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The chip focused or pressed last: the group's single Tab stop. */
  const [lastId, setLastId] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  /* ---------- Static layout derived from the data ---------- */
  const layout = useMemo(() => computeLayout(graph), [graph]);

  /* ---------- Interaction state ---------- */
  // Keyboard focus outranks hover, so the panel always describes the focused chip.
  const activeId = focusId ?? hoverId ?? selectedId;
  const activeNode: DnaNode | undefined = activeId ? graph.nodes[activeId] : undefined;
  const mode: PanelMode = !activeNode ? "rest" : activeId === selectedId ? "pinned" : "preview";
  const linked = new Map(activeNode?.connections.map((connection) => [connection.id, connection]) ?? []);
  const selectedNode: DnaNode | undefined = selectedId ? graph.nodes[selectedId] : undefined;
  const tabStopId = lastId ?? selectedId ?? layout.firstId;

  const nodeState = (id: string): NodeState => {
    if (!activeNode) return "idle";
    if (id === activeNode.id) return "active";
    if (linked.has(id)) return "linked";
    return graph.nodes[id]?.domain === activeNode.domain ? "peer" : "dim";
  };

  const domainState = (domain: DomainLayout): DomainState => {
    if (!activeNode) return "idle";
    if (domain.id === activeNode.domain) return "active";
    return domain.nodeIds.some((id) => linked.has(id)) ? "linked" : "dim";
  };

  /** Same-lane links bow out on the lane's outer side: left for the first lane, right otherwise. */
  const arcSide = (lane: number): ArcSide => (lane === layout.lanes[0] ? "left" : "right");

  /** Which edge of a linked chip the incoming line lands on (desktop). */
  const portSide = (id: string): ArcSide => {
    if (!activeNode) return "left";
    const laneA = layout.laneOf[activeNode.id] ?? 0;
    const laneB = layout.laneOf[id] ?? 0;
    if (laneA === laneB) return arcSide(laneA);
    return laneB > laneA ? "left" : "right";
  };

  /* ---------- Pointer capability ---------- */
  useEffect(() => {
    const query = window.matchMedia(HOVER_QUERY);
    const update = () => {
      canHover.current = query.matches;
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const timer = hoverTimer;
    return () => window.clearTimeout(timer.current);
  }, []);

  /* ---------- Desktop geometry for the SVG wiring ---------- */
  useEffect(() => {
    const container = graphRef.current;
    if (!container) return;
    const desktop = window.matchMedia(DESKTOP_QUERY);
    let frame = 0;
    let disposed = false;

    const measure = () => {
      frame = 0;
      if (disposed) return;
      if (!desktop.matches) {
        setGeometry(null);
        return;
      }
      const hubElement = container.querySelector<HTMLElement>("[data-dna-hub]");
      const heads: Partial<Record<DnaDomainId, Box>> = {};
      container.querySelectorAll<HTMLElement>("[data-dna-head]").forEach((element) => {
        heads[element.dataset.dnaHead as DnaDomainId] = boxWithin(element, container);
      });
      const lanes: Record<number, LaneBox> = {};
      container.querySelectorAll<HTMLElement>("[data-dna-lane-box]").forEach((element) => {
        const spineOffset = Number.parseFloat(getComputedStyle(element).getPropertyValue("--spine-x"));
        lanes[Number(element.dataset.dnaLaneBox)] = {
          spine: boxWithin(element, container).x + (Number.isFinite(spineOffset) ? spineOffset : 24),
          top: Infinity,
          bottom: -Infinity,
        };
      });
      const nodes: Record<string, Box> = {};
      container.querySelectorAll<HTMLElement>("[data-dna-node]").forEach((element) => {
        const id = element.dataset.dnaNode;
        if (!id) return;
        const box = boxWithin(element, container);
        nodes[id] = box;
        const lane = lanes[Number(element.dataset.dnaLane)];
        if (lane) {
          lane.top = Math.min(lane.top, box.y + box.h / 2);
          lane.bottom = Math.max(lane.bottom, box.y + box.h / 2);
        }
      });
      setGeometry({
        width: container.clientWidth,
        height: container.clientHeight,
        hub: hubElement ? boxWithin(hubElement, container) : null,
        heads,
        nodes,
        lanes,
      });
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    // Fires once on observe, then on every size change (including font swaps that reflow the grid).
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(container);
    desktop.addEventListener("change", schedule);
    const fonts = document.fonts;
    fonts?.addEventListener?.("loadingdone", schedule);
    fonts?.ready.then(schedule).catch(() => {});

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      desktop.removeEventListener("change", schedule);
      fonts?.removeEventListener?.("loadingdone", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /* ---------- Escape clears the selection ---------- */
  const hasSelectionOrFocus = selectedId !== null || focusId !== null;
  useEffect(() => {
    if (!hasSelectionOrFocus) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      // Leave Escape to the command palette, the mobile menu and form fields. Both overlays
      // are still open (in the DOM) while their own Escape handling runs.
      if (document.querySelector("dialog[open], #mobile-menu")) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('dialog, [role="dialog"], [aria-modal="true"], input, textarea, select')) return;
      const shown = focusId ?? selectedId;
      // The panel's content is about to change; don't strand focus on a control that disappears.
      const focusInPanel = panelRef.current?.contains(document.activeElement) ?? false;
      setSelectedId(null);
      setFocusId(null);
      if (focusInPanel && shown) returnFocus(shown, skipPreview);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasSelectionOrFocus, focusId, selectedId]);

  /* ---------- Phones and tablets: reserve the docked panel's height as scroll padding ---------- */
  // While a selection is pinned the panel docks at the bottom of the viewport (see tech-dna.css).
  // Its height feeds `scroll-padding-bottom` on <html>, so focusing a chip scrolls it above the panel.
  const pinned = selectedId !== null;
  useEffect(() => {
    const panel = panelRef.current;
    if (!pinned || !panel) return;
    const root = document.documentElement;
    const update = () => {
      if (getComputedStyle(panel).position === "sticky") {
        root.style.setProperty("--dna-dock-h", `${panel.offsetHeight}px`);
      } else {
        root.style.removeProperty("--dna-dock-h");
      }
    };
    // Fires once on observe, then whenever the panel's content changes its height.
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    // Docking also depends on the viewport size.
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      root.style.removeProperty("--dna-dock-h");
    };
  }, [pinned]);

  /* ---------- Phones and tablets: keep the tapped chip clear of the docked panel ---------- */
  useEffect(() => {
    if (!selectedId || window.matchMedia(DESKTOP_QUERY).matches) return;
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const button = document.getElementById(nodeDomId(selectedId));
      if (!panel || getComputedStyle(panel).position !== "sticky" || !button) return;
      // Compare with where the panel docks, not where it is now: near the top of the cards the
      // sticky panel is still clamped to them and moves as the page scrolls.
      const inset = Number.parseFloat(getComputedStyle(panel).bottom) || 0;
      const dockedTop = window.innerHeight - inset - panel.offsetHeight;
      const overlap = button.getBoundingClientRect().bottom + 16 - dockedTop;
      if (overlap > 0 && dockedTop > 120) {
        const reduce = window.matchMedia(REDUCED_MOTION_QUERY).matches;
        window.scrollBy({ top: overlap, behavior: reduce ? "instant" : "smooth" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedId]);

  /* ---------- Node handlers ---------- */
  /** Keyboard use ends any hover preview; hover resumes only once the mouse moves again. */
  const enterKeyboardMode = () => {
    keyboardMode.current = true;
    window.clearTimeout(hoverTimer.current);
    setHoverId(null);
  };

  const onPointerEnter = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.pointerType !== "mouse" || !canHover.current) return;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    if (keyboardMode.current) return;
    window.clearTimeout(hoverTimer.current);
    setHoverId(id);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.pointerType !== "mouse" || !canHover.current) return;
    const last = lastPointer.current;
    // Same position: the page scrolled under a resting pointer (e.g. a keyboard focus scroll).
    if (last && last.x === event.clientX && last.y === event.clientY) return;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    if (!keyboardMode.current) return;
    keyboardMode.current = false;
    window.clearTimeout(hoverTimer.current);
    setHoverId(id);
  };

  const onPointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoverId(null), HOVER_RELEASE_MS);
  };

  const onFocus = (event: FocusEvent<HTMLButtonElement>, id: string) => {
    setLastId(id);
    // Focus returned by script after a clear: no preview.
    if (skipPreview.current) return;
    // Keyboard focus previews a node. A mouse click focuses the button too, but that is handled by click.
    let keyboard = true;
    try {
      keyboard = event.currentTarget.matches(":focus-visible");
    } catch {
      // Very old browsers without :focus-visible: treat every focus as a preview.
    }
    if (!keyboard) return;
    enterKeyboardMode();
    setFocusId(id);
  };

  const onBlur = (event: FocusEvent<HTMLButtonElement>, id: string) => {
    // Tabbing into the info panel keeps describing this chip, so its links stay put.
    if (event.relatedTarget instanceof Node && panelRef.current?.contains(event.relatedTarget)) return;
    setFocusId((current) => (current === id ? null : current));
  };

  /** While focus is inside the panel, hold its content still so the focused link can't vanish. */
  const onPanelFocus = () => {
    if (focusId === null && activeId !== null) setFocusId(activeId);
  };

  const onPanelBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
    // Focus left the panel (to the page, or back to a chip, whose own focus handler takes over).
    setFocusId(null);
  };

  const toggle = (id: string) => {
    setLastId(id);
    setSelectedId((current) => (current === id ? null : id));
  };

  /** Desktop: the chip in the next lane (column) whose center is closest to this chip's. */
  const chipInLane = (id: string, step: number): string | undefined => {
    const { lanes, laneNodes, laneOf } = layout;
    const index = lanes.indexOf(laneOf[id] ?? -1);
    if (index < 0 || lanes.length < 2) return undefined;
    const lane = lanes[(index + step + lanes.length) % lanes.length];
    const center = (nodeId: string) => {
      const rect = document.getElementById(nodeDomId(nodeId))?.getBoundingClientRect();
      return rect ? rect.top + rect.height / 2 : undefined;
    };
    const from = center(id) ?? 0;
    let best: string | undefined;
    let bestDistance = Infinity;
    for (const candidate of laneNodes[lane] ?? []) {
      const to = center(candidate);
      if (to === undefined) continue;
      const distance = Math.abs(to - from);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }
    return best;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    enterKeyboardMode();
    const node = graph.nodes[id];
    const domainIndex = layout.domains.findIndex((domain) => domain.id === node?.domain);
    const domain = layout.domains[domainIndex];
    if (!domain) return;
    const ids = domain.nodeIds;
    const index = ids.indexOf(id);
    let target: string | undefined;

    switch (event.key) {
      case "ArrowDown":
        target = ids[(index + 1) % ids.length];
        break;
      case "ArrowUp":
        target = ids[(index - 1 + ids.length) % ids.length];
        break;
      case "Home":
        target = ids[0];
        break;
      case "End":
        target = ids[ids.length - 1];
        break;
      case "ArrowRight":
      case "ArrowLeft": {
        const step = event.key === "ArrowRight" ? 1 : -1;
        if (window.matchMedia(DESKTOP_QUERY).matches) {
          // Desktop columns are lanes (a domain can span two), so step to the adjacent column.
          target = chipInLane(id, step);
        } else {
          const count = layout.domains.length;
          const next = layout.domains[(domainIndex + step + count) % count];
          target = next.nodeIds[Math.min(index, next.nodeIds.length - 1)];
        }
        break;
      }
      default:
        return;
    }

    if (!target || target === id) return;
    event.preventDefault();
    document.getElementById(nodeDomId(target))?.focus();
  };

  /** Both Clear buttons remove themselves, so focus goes back to the chip the panel described. */
  const clearSelection = () => {
    const shown = focusId ?? selectedId;
    setSelectedId(null);
    setFocusId(null);
    if (shown) returnFocus(shown, skipPreview);
  };

  /* ---------- Wiring (desktop only; empty until measured) ---------- */
  const hubLinks =
    geometry?.hub != null
      ? layout.domains.flatMap((domain) => {
          const head = geometry.heads[domain.id];
          if (!head || !geometry.hub) return [];
          return [{ id: domain.id, order: domain.order, d: hubPath(geometry.hub, head), state: domainState(domain) }];
        })
      : [];

  const headsBottom = geometry
    ? Math.max(0, ...Object.values(geometry.heads).map((box) => (box ? box.y + box.h : 0)))
    : 0;
  const crossLinks =
    geometry && activeNode
      ? activeNode.connections.flatMap((connection) => {
          const from = geometry.nodes[activeNode.id];
          const to = geometry.nodes[connection.id];
          const laneA = layout.laneOf[activeNode.id];
          const laneB = layout.laneOf[connection.id];
          if (!from || !to || laneA === undefined || laneB === undefined) return [];
          const key = `${activeNode.id}->${connection.id}`;

          if (laneA !== laneB) {
            const obstacles = Object.entries(geometry.nodes)
              .filter(([id]) => id !== activeNode.id && id !== connection.id)
              .map(([, box]) => box);
            return [{ key, d: linkPath(from, to, laneA, laneB, obstacles, headsBottom) }];
          }

          const lane = geometry.lanes[laneA];
          if (!lane) return [];
          const side = arcSide(laneA);
          // The chips the arc passes, both ends included: it must bow out past all of them.
          const top = Math.min(from.y, to.y);
          const bottom = Math.max(from.y + from.h, to.y + to.h);
          const spanned = (layout.laneNodes[laneA] ?? []).flatMap((id) => {
            const box = geometry.nodes[id];
            return box && box.y >= top && box.y + box.h <= bottom ? [box] : [];
          });
          const edge =
            side === "left"
              ? Math.min(...spanned.map((box) => box.x))
              : Math.max(...spanned.map((box) => box.x + box.w));
          const nextLane = geometry.lanes[layout.lanes[layout.lanes.indexOf(laneA) + 1] ?? -1];
          const limit = side === "left" ? ARC_MARGIN : (nextLane?.spine ?? geometry.width) - ARC_MARGIN;
          return [{ key, d: arcPath(from, to, side, lane, edge, limit) }];
        })
      : [];

  /* ---------- Copy derived from the data ---------- */
  const projectNames = graph.sources.filter((source) => source.kind === "project").map((source) => source.name);
  const experienceNames = graph.sources.filter((source) => source.kind === "experience").map((source) => source.name);
  const sourcesSentence = joinNames([
    ...(projectNames.length > 0 ? [`my projects (${joinNames(projectNames)})`] : []),
    ...experienceNames.map((name) => `my ${name}`),
  ]);

  const gridStyle = {
    "--dna-tracks": layout.totalTracks,
    "--dna-panel-col": layout.panelStart + 1,
    "--dna-panel-span": layout.panelSpan,
  } as CSSProperties;

  return (
    <div className="dna" data-reveal="">
      <div ref={graphRef} className="dna-graph relative">
        {/* Blueprint dot grid (desktop) */}
        <div aria-hidden="true" className="dna-dots pointer-events-none absolute inset-0 hidden rounded-[inherit] lg:block" />

        {/* Wiring: hub to domains (always), active skill to its connections. Decorative. */}
        <svg
          aria-hidden="true"
          focusable="false"
          className="dna-wires pointer-events-none absolute inset-0 hidden overflow-visible lg:block"
          width={geometry?.width ?? 0}
          height={geometry?.height ?? 0}
        >
          {hubLinks.map((link) => (
            <path
              key={link.id}
              d={link.d}
              pathLength={1}
              className="dna-wire"
              data-state={link.state}
              style={{ "--dna-delay": `${140 + link.order * 70}ms` } as CSSProperties}
            />
          ))}
          {crossLinks.map((link) => (
            <path key={link.key} d={link.d} pathLength={1} className="dna-link" />
          ))}
        </svg>

        {/* Hub */}
        <div className="relative z-[1] mb-3 lg:mb-14 lg:flex lg:justify-center">
          <div
            data-dna-hub=""
            className="dna-stage dna-hub relative flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-2xl border border-line bg-bg-raised/60 p-4 lg:w-fit lg:flex-nowrap lg:rounded-xl lg:border-line-strong lg:bg-surface lg:py-3 lg:pr-5 lg:pl-3.5"
            style={{ "--dna-delay": "0ms" } as CSSProperties}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-tint/[0.04] text-fg-muted">
              <UserRound aria-hidden="true" focusable="false" className="size-[1.125rem]" strokeWidth={1.6} />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[0.6875rem] leading-4 tracking-[0.08em] text-fg-subtle uppercase">
                {hub.name}
              </p>
              <p className="font-display text-lg leading-tight font-semibold tracking-[-0.01em] text-fg">{hub.title}</p>
            </div>
            <p className="flex w-full gap-4 border-t border-line pt-2.5 font-mono text-[0.6875rem] leading-4 text-fg-subtle sm:ml-auto sm:block sm:w-auto sm:border-0 sm:pt-0 sm:text-right lg:ml-2 lg:border-l lg:pl-4">
              <span className="block">{layout.domains.length} domains</span>
              <span className="block">{layout.nodeCount} skills</span>
            </p>
          </div>
        </div>

        <div className="dna-grid relative z-[1]" style={gridStyle}>
          {/* One Tab stop for every chip (roving tabindex); arrow keys move within the group.
              display: contents keeps the domains as direct items of the grid. */}
          <div role="group" aria-label={GROUP_LABEL} className="contents">
            {layout.domains.map((domain) => {
              const DomainIcon = domainIcons[domain.id];
              const multiGroup = domain.groups.length > 1;
              const headingId = domainHeadingId(domain.id);

              return (
                <div
                  key={domain.id}
                  className="dna-domain"
                  data-state={domainState(domain)}
                  style={
                    {
                      "--dna-col": domain.trackStart + 1,
                      "--dna-span": domain.lanes.length,
                      "--dna-rows": domain.rows,
                      "--dna-lanes": domain.lanes.length,
                    } as CSSProperties
                  }
                >
                  <div
                    data-dna-head={domain.id}
                    className="dna-stage dna-head relative flex items-center gap-2.5"
                    style={{ "--dna-delay": `${120 + domain.order * 60}ms` } as CSSProperties}
                  >
                    <span className="dna-head-icon grid size-7 shrink-0 place-items-center rounded-md border border-line bg-tint/[0.04] text-fg-muted">
                      <DomainIcon aria-hidden="true" focusable="false" className="size-3.5" strokeWidth={1.75} />
                    </span>
                    <h3
                      id={headingId}
                      className="font-mono text-xs leading-4 font-medium tracking-[0.12em] text-fg uppercase"
                    >
                      {domain.label}
                    </h3>
                    <span aria-hidden="true" className="ml-auto font-mono text-[0.6875rem] text-fg-subtle tabular-nums">
                      {String(domain.size).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="dna-lanes">
                    {domain.laneLayouts.map((lane) => {
                      const laneLastId = lane.groups.at(-1)?.nodeIds.at(-1);
                      return (
                        <div key={lane.index} className="dna-lane" data-dna-lane-box={lane.index}>
                          {lane.groups.map((group) => (
                            <Fragment key={group.id}>
                              {multiGroup ? (
                                <h4
                                  id={groupHeadingId(group.id)}
                                  className="dna-stage dna-row dna-row-label font-mono text-[0.6875rem] leading-4 tracking-[0.08em] text-fg-subtle uppercase"
                                  style={
                                    {
                                      "--dna-delay": rowDelay(domain.order, domain.rowOrder[`group:${group.id}`] ?? 0),
                                    } as CSSProperties
                                  }
                                >
                                  {group.label}
                                </h4>
                              ) : null}
                              <ul
                                aria-labelledby={multiGroup ? groupHeadingId(group.id) : headingId}
                                className="dna-list"
                              >
                                {group.nodeIds.map((id) => {
                                  const node = graph.nodes[id];
                                  if (!node) return null;
                                  const state = nodeState(id);
                                  return (
                                    <li
                                      key={id}
                                      className="dna-stage dna-row"
                                      data-state={state}
                                      data-last={id === laneLastId ? "" : undefined}
                                      data-port={state === "linked" ? portSide(id) : undefined}
                                      style={
                                        {
                                          "--dna-delay": rowDelay(domain.order, domain.rowOrder[id] ?? 0),
                                        } as CSSProperties
                                      }
                                    >
                                      <button
                                        type="button"
                                        id={nodeDomId(id)}
                                        className="dna-chip"
                                        data-dna-node={id}
                                        data-dna-lane={lane.index}
                                        tabIndex={id === tabStopId ? 0 : -1}
                                        aria-pressed={selectedId === id}
                                        aria-describedby={nodeDescriptionId(id)}
                                        onClick={() => toggle(id)}
                                        onPointerEnter={(event) => onPointerEnter(event, id)}
                                        onPointerMove={(event) => onPointerMove(event, id)}
                                        onPointerLeave={onPointerLeave}
                                        onFocus={(event) => onFocus(event, id)}
                                        onBlur={(event) => onBlur(event, id)}
                                        onKeyDown={(event) => onKeyDown(event, id)}
                                      >
                                        <span aria-hidden="true" className="dna-port" />
                                        {node.name}
                                      </button>
                                      {/* Static description (server-rendered); hidden, but still read via aria-describedby. */}
                                      <span id={nodeDescriptionId(id)} hidden>
                                        {describeNode(node)}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </Fragment>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Info panel: words for everything the highlights and lines show. */}
          <div
            ref={panelRef}
            className="dna-stage dna-panel relative rounded-2xl border border-line-strong bg-surface p-4 sm:p-5"
            data-mode={mode}
            data-pinned={selectedNode ? "" : undefined}
            onFocus={onPanelFocus}
            onBlur={onPanelBlur}
            style={{ "--dna-delay": "420ms" } as CSSProperties}
          >
            {/* Desktop header: what the panel is showing and how to change it. */}
            <div className="hidden min-h-8 items-center justify-between gap-3 border-b border-line pb-3 lg:flex">
              <p aria-hidden="true" className="eyebrow flex items-center gap-2">
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-colors duration-200",
                    mode === "rest" ? "bg-tint/25" : "bg-accent",
                  )}
                />
                {mode === "pinned" ? "Pinned" : mode === "preview" ? "Preview" : "Inspector"}
              </p>
              <div className="flex items-center gap-3">
                {mode === "preview" ? (
                  <p aria-hidden="true" className="font-mono text-[0.6875rem] text-fg-subtle">
                    {activeId === hoverId ? (
                      "Click to pin"
                    ) : (
                      <>
                        <kbd className="dna-kbd">Enter</kbd> pins
                      </>
                    )}
                  </p>
                ) : mode === "rest" ? (
                  <p aria-hidden="true" className="font-mono text-[0.6875rem] text-fg-subtle">
                    {graph.sources.length} {graph.sources.length === 1 ? "source" : "sources"}
                  </p>
                ) : null}
                {selectedNode ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    aria-label={`Clear selection: ${selectedNode.name}`}
                    className="dna-clear inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 font-mono text-[0.6875rem] text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                  >
                    <X aria-hidden="true" focusable="false" className="size-3.5" />
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {/* Phones and tablets: a close button on the docked panel. */}
            {selectedNode ? (
              <button
                type="button"
                onClick={clearSelection}
                aria-label={`Clear selection: ${selectedNode.name}`}
                className="absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-tint/[0.06] hover:text-fg lg:hidden"
              >
                <X aria-hidden="true" focusable="false" className="size-4" />
              </button>
            ) : null}

            <div className="lg:pt-4">
              {activeNode ? (
                <NodeDetails node={activeNode} graph={graph} />
              ) : (
                <div>
                  <p className="dna-js-only text-[0.9375rem] leading-relaxed text-fg">
                    Hover, focus or tap a skill to see where it connects.
                  </p>
                  {sourcesSentence ? (
                    <p className="mt-2 text-sm leading-relaxed text-fg-muted">
                      Connections show skills used together in {sourcesSentence}.
                    </p>
                  ) : null}
                  <ul
                    aria-hidden="true"
                    className="dna-js-only mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 font-mono text-[0.6875rem] leading-4 text-fg-subtle"
                  >
                    <li className="flex items-center gap-2">
                      <span className="dna-key" data-key="active" />
                      Selected
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="dna-key" data-key="linked" />
                      Connected
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="dna-key" />
                      Same domain
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="dna-key" data-key="dim" />
                      Not linked
                    </li>
                    <li className="hidden items-center gap-2 lg:flex">
                      <span className="dna-key-line" />
                      Used together
                    </li>
                  </ul>
                  <p
                    aria-hidden="true"
                    className="dna-js-only mt-4 hidden flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.6875rem] leading-5 text-fg-subtle lg:flex"
                  >
                    <span>
                      <kbd className="dna-kbd">↑</kbd> <kbd className="dna-kbd">↓</kbd> within domain
                    </span>
                    <span>
                      <kbd className="dna-kbd">←</kbd> <kbd className="dna-kbd">→</kbd> next column
                    </span>
                    <span>
                      <kbd className="dna-kbd">Esc</kbd> clears
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Details for the active skill. Facts only: names, groups, sources and shared sources. */
function NodeDetails({ node, graph }: { node: DnaNode; graph: TechDnaGraph }) {
  const domain = graph.domains.find((item) => item.id === node.domain);
  const sources = node.usedIn
    .map((name) => graph.sources.find((source) => source.name === name))
    .filter((source): source is NonNullable<typeof source> => Boolean(source));
  const connections = node.connections
    .map((connection) => graph.nodes[connection.id])
    .filter((item): item is DnaNode => Boolean(item));
  const peers = (domain?.size ?? 1) - 1;

  return (
    <div>
      <p className="pr-10 font-mono text-[0.6875rem] leading-4 tracking-[0.08em] text-fg-subtle uppercase lg:pr-0">
        {domain && domain.groups.length > 1 ? (
          <>
            {domain.label}
            <span aria-hidden="true"> / </span>
            <span className="sr-only">, </span>
          </>
        ) : null}
        {node.groupLabel}
      </p>
      <p className="mt-1 pr-10 font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-fg lg:pr-0 lg:text-2xl">
        {node.name}
      </p>

      <dl className="mt-3 grid gap-3 lg:mt-4 lg:gap-4">
        {sources.length > 0 ? (
          <div>
            <dt className="eyebrow">Used in</dt>
            <dd className="mt-1 lg:mt-2">
              <ul className="dna-sources">
                {sources.map((source) => (
                  <li key={source.name}>
                    <a href={source.href} className="dna-source">
                      <span>{source.name}</span>
                      <span className="dna-source-kind">{source.kind === "project" ? "Project" : "Experience"}</span>
                      <ArrowDownRight aria-hidden="true" focusable="false" className="dna-source-icon" />
                    </a>
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="eyebrow">
            Connected to
            {connections.length > 0 ? <span className="text-fg-subtle"> ({connections.length})</span> : null}
          </dt>
          <dd className="mt-1 lg:mt-2">
            {connections.length > 0 ? (
              <ul className="dna-tags">
                {connections.map((item) => (
                  <li key={item.id} className="dna-tag">
                    {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-fg-muted">
                {peers > 0
                  ? `Grouped with the other ${peers} ${domain ? `${domain.label} ` : ""}skills.`
                  : "Not linked to other skills."}
              </p>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
