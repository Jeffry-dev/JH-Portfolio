"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { ArrowRight, CodeXml, Database, Server, UserRound, Workflow, X, type LucideIcon } from "lucide-react";
import type { DnaDomain, DnaDomainId, DnaGroup, DnaNode, DnaSource, TechDnaGraph } from "@/data/tech-dna";
import { CountUp } from "@/components/ui/count-up";
import { FROM_SKILL_ATTR, SKILL_LINK_ATTR } from "@/lib/tech-links";
import { cn } from "@/lib/utils";

/**
 * Technical DNA: the skills as one connected system.
 *
 * Server-rendered as plain, readable markup (hub, four domains, every skill). Skills that a
 * project or role on the site uses get solid chips; skills that are only in the toolkit get
 * dashed ones. On the client it becomes an explorer: hovering (fine pointer), focusing or
 * tapping a skill highlights what it was used with, and on desktop an SVG layer draws the
 * hub-to-domain wiring plus curved links for the active skill. The info panel explains each
 * selection in words, place by place, so nothing depends on the lines or on color.
 *
 * Motion (all in tech-dna.css, keyed off the reveal classes and data attributes set here):
 * - Signal ripple: the whole explorer is one reveal and each domain card is its own, so on a
 *   phone a domain ripples as it scrolls into view. When a domain reveals, the hub lights,
 *   then its header, group labels and chips light in reading order (`--i`), at most about
 *   1 s from first to last (`--dna-step`). Everything waits ENTRANCE_WAIT_MS (0.8 s) after the
 *   reveal first, so the map is in view when it starts. On desktop the hub wires draw first
 *   and the ripple runs down each column (`--j`) as its wire arrives (`--dna-order`).
 * - Pinning blooms the chip's ring. Where no wires show (stacked layout, or touch at any
 *   width) the connected chips pulse once in reading order (`data-pulse`, `--k`). On desktop
 *   the curved links draw in from the active chip, each a little after the previous (`--k`).
 * - The docked panel on phones slides up and its lines follow 40 ms apart (`data-dock-item`).
 * Reduced motion turns all of it off in CSS, so the handlers here never need to check it,
 * except before starting the pulse timer.
 *
 * Hover: a preview lasts until the pointer rests on another chip or leaves the whole graph,
 * so the pointer can travel to the panel's links; chips crossed on the way don't replace it.
 *
 * Keyboard: the chips are one Tab stop (roving tabindex). Arrow keys move between them,
 * Enter or Space pins, Tab continues into the info panel, Escape clears. Keyboard focus
 * always outranks mouse hover. Each chip also carries a short static description, so
 * nothing has to be announced live.
 *
 * Skill links: a click on any `a[data-skill]` on the page (lib/tech-links.ts) scrolls that
 * skill's chip into view, pins it and moves focus to it. Without JavaScript it jumps to #skills.
 */

/** What the explorer reads. `edges` repeats each node's `connections`, so it stays on the server. */
export type TechDnaClientGraph = Omit<TechDnaGraph, "edges">;

interface TechDnaProps {
  graph: TechDnaClientGraph;
  hub: { name: string; title: string };
}

type NodeState = "idle" | "active" | "linked" | "dim";
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

/** Where a skill was used, and which other skills were used there with it. */
interface Usage {
  source: DnaSource;
  /** Names of the other skills from that source, in display order. */
  withNames: string[];
}

const GROUP_LABEL = "Skills, use arrow keys to move";
const DESKTOP_QUERY = "(min-width: 64rem)";
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
/** While a preview shows, the pointer has to rest this long on another chip to switch to it. */
const HOVER_SWITCH_MS = 100;
/** Signal ripple: one item every 50 ms, squeezed so a domain spans at most about 650 ms. */
const RIPPLE_STEP_MS = 70;
const RIPPLE_SPAN_MS = 1000;
/**
 * Entrance pause: once the map is revealed, everything waits this long before the wires, the
 * ripple and the counters start, so the visitor has scrolled it into view. Written on the root
 * as --dna-wait for tech-dna.css, and passed to the counters.
 */
const ENTRANCE_WAIT_MS = 800;
/** Counters take their time too, in step with the slower ripple. */
const COUNT_MS = 1200;
/** Connected chips pulse once after a pin without wires: each bloom, the gap, and the gap's cap. */
const PULSE_MS = 600;
const PULSE_STAGGER_MS = 40;
const PULSE_STAGGER_CAP_MS = 400;
/** Panel and description copy for a skill that no project or role on the site lists. */
const TOOLKIT_COPY = "Part of my toolkit.";

type InputKind = "mouse" | "touch" | "keyboard";

/** Position of a lit item in the signal ripple: within its domain (`i`) and within its lane (`j`). */
interface RipplePosition {
  i: number;
  j: number;
}

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

function usageOf(node: DnaNode, graph: TechDnaClientGraph): Usage[] {
  return node.usedIn.flatMap((name) => {
    const source = graph.sources.find((item) => item.name === name);
    if (!source) return [];
    const withNames = node.connections
      .filter((connection) => connection.sharedIn.includes(name))
      .flatMap((connection) => graph.nodes[connection.id]?.name ?? []);
    return [{ source, withNames }];
  });
}

/**
 * Static screen reader description of a chip, in the same terms as the info panel, e.g.
 * "Used in Market Desk, with NestJS and React; and in SmartHub, with NestJS."
 */
function describeNode(node: DnaNode, graph: TechDnaClientGraph): string {
  const clauses = usageOf(node, graph).map(({ source, withNames }) =>
    withNames.length > 0 ? `${source.phrase}, with ${joinNames(withNames)}` : source.phrase,
  );
  const last = clauses.pop();
  if (last === undefined) return TOOLKIT_COPY;
  return `Used in ${clauses.length > 0 ? `${clauses.join("; in ")}; and in ${last}` : last}.`;
}

/**
 * The panel entry likely to need the most room: a rough count of wrapped lines, then of
 * characters. On desktop an invisible copy of it reserves the panel's height.
 */
function largestEntry(graph: TechDnaClientGraph): DnaNode | undefined {
  let largest: DnaNode | undefined;
  let largestScore = -1;
  for (const node of Object.values(graph.nodes)) {
    const usage = usageOf(node, graph);
    const texts =
      usage.length > 0
        ? usage.flatMap(({ source, withNames }) => [
            source.name,
            ...(withNames.length > 0 ? [`with ${joinNames(withNames)}`] : []),
          ])
        : [TOOLKIT_COPY];
    const lines = texts.reduce((total, text) => total + Math.ceil(text.length / 36), Math.ceil(node.name.length / 22));
    const score = lines * 1000 + texts.join("").length + node.name.length;
    if (score > largestScore) {
      largest = node;
      largestScore = score;
    }
  }
  return largest;
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
 * keeps the one that passes behind the fewest other chips. Where one still has to pass behind
 * a chip, that chip is slightly see-through (tech-dna.css), so the line visibly continues
 * instead of seeming to start at a skill it isn't connected to.
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

/** Layout box relative to `container`, from offsets so transforms (e.g. a pressed chip) don't skew it. */
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
  /** 2 = spans the first two desktop rows; 1 = shares its tracks with the info panel below it. */
  rows: number;
  laneLayouts: LaneLayout[];
  nodeIds: string[];
  /** Signal ripple gap between items, in ms: 50, or less so the domain finishes in time. */
  rippleStep: number;
}

/** Desktop grid placement, lane membership and ripple order, derived from the data. Pure. */
function computeLayout(graph: TechDnaClientGraph) {
  const totalTracks = graph.domains.reduce((total, domain) => total + domain.lanes.length, 0);
  // The info panel sits under the right-most domains on desktop.
  const panelSpan = Math.min(2, totalTracks);
  const panelStart = totalTracks - panelSpan;
  const laneOf: Record<string, number> = {};
  /** Node ids per lane, top to bottom. */
  const laneNodes: Record<number, string[]> = {};
  /** Signal ripple order of every chip (by node id) and group label (by group id). The header is 0. */
  const ripple: { nodes: Record<string, RipplePosition>; labels: Record<string, RipplePosition> } = {
    nodes: {},
    labels: {},
  };
  const domains: DomainLayout[] = [];
  let track = 0;

  graph.domains.forEach((domain, order) => {
    const trackStart = track;
    track += domain.lanes.length;
    const groupsById = new Map(domain.groups.map((group) => [group.id, group]));
    // Group labels are rendered (and lit) only when a domain has more than one group.
    const labelled = domain.groups.length > 1;
    let items = 0;
    const laneLayouts = domain.lanes.map((groupIds, position) => {
      const index = trackStart + position;
      const groups = groupIds
        .map((id) => groupsById.get(id))
        .filter((group): group is DnaGroup => Boolean(group));
      let j = 0;
      for (const group of groups) {
        if (labelled) ripple.labels[group.id] = { i: items + ++j, j };
        for (const id of group.nodeIds) {
          laneOf[id] = index;
          (laneNodes[index] ??= []).push(id);
          ripple.nodes[id] = { i: items + ++j, j };
        }
      }
      items += j;
      return { index, groups };
    });

    domains.push({
      ...domain,
      order,
      trackStart,
      rows: trackStart + domain.lanes.length > panelStart ? 1 : 2,
      laneLayouts,
      nodeIds: laneLayouts.flatMap((lane) => lane.groups.flatMap((group) => group.nodeIds)),
      rippleStep: Math.min(RIPPLE_STEP_MS, Math.round(RIPPLE_SPAN_MS / Math.max(1, items))),
    });
  });

  const nodeCount = domains.reduce((total, domain) => total + domain.size, 0);
  /** Lanes that hold chips, left to right. */
  const lanes = Object.keys(laneNodes)
    .map(Number)
    .sort((a, b) => a - b);
  const firstId = domains[0]?.nodeIds[0] ?? null;
  return { domains, totalTracks, panelStart, panelSpan, laneOf, laneNodes, lanes, ripple, nodeCount, firstId };
}

/** Legend rows. Display is set per row, so one can be hidden below desktop. */
const legendClass = "flex-wrap gap-x-5 gap-y-1.5 font-mono text-xs leading-4 text-fg-subtle";
const legendItemClass = "flex items-center gap-2";

export function TechDna({ graph, hub }: TechDnaProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Pending switch of a hover preview to another chip (see HOVER_SWITCH_MS). */
  const switchTimer = useRef<number | undefined>(undefined);
  /** Pending check that a tapped chip sits clear of the docked panel. */
  const dockFrame = useRef(0);
  /** Ends the one-time pulse of the connected chips. */
  const pulseTimer = useRef<number | undefined>(undefined);
  /** What pressed last: a mouse gets the desktop wires, anything else the pulse as well. */
  const lastInput = useRef<InputKind>("mouse");
  const canHover = useRef(false);
  /** True from a keyboard focus or key press until the mouse really moves over a chip again. */
  const keyboardMode = useRef(false);
  /** Last mouse position seen over a chip, to tell real movement from content scrolling under it. */
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  /** Set while focus is moved to a chip by script, so that focus doesn't start a preview. */
  const skipPreview = useRef(false);

  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** The chip focused or pressed last: the group's single Tab stop. */
  const [lastId, setLastId] = useState<string | null>(null);
  /** The pinned chip whose connections are pulsing right now. */
  const [pulseId, setPulseId] = useState<string | null>(null);
  /** Counts pins that pulse; its parity alternates the bloom keyframes so every pin restarts them. */
  const [pulseRun, setPulseRun] = useState(0);
  const [geometry, setGeometry] = useState<Geometry | null>(null);

  /* ---------- Static data derived from the graph ---------- */
  const layout = useMemo(() => computeLayout(graph), [graph]);
  const descriptions = useMemo(
    () => Object.fromEntries(Object.values(graph.nodes).map((node) => [node.id, describeNode(node, graph)])),
    [graph],
  );
  const largest = useMemo(() => largestEntry(graph), [graph]);
  const usedCount = useMemo(() => Object.values(graph.nodes).filter((node) => node.tier === "used").length, [graph]);
  /** Lower-cased skill name or alias ("sql server") -> node id, for skill links. */
  const skillIds = useMemo(() => {
    const ids = new Map(Object.entries(graph.aliases));
    for (const node of Object.values(graph.nodes)) ids.set(node.name.toLowerCase(), node.id);
    return ids;
  }, [graph]);

  /* ---------- Interaction state ---------- */
  // Keyboard focus outranks hover, so the panel always describes the focused chip.
  const activeId = focusId ?? hoverId ?? selectedId;
  const activeNode: DnaNode | undefined = activeId ? graph.nodes[activeId] : undefined;
  const mode: PanelMode = !activeNode ? "rest" : activeId === selectedId ? "pinned" : "preview";
  /** Connected node id -> its place in the active skill's connections (reading order). */
  const linked = new Map(activeNode?.connections.map((connection, k) => [connection.id, k]) ?? []);
  const selectedNode: DnaNode | undefined = selectedId ? graph.nodes[selectedId] : undefined;
  const tabStopId = lastId ?? selectedId ?? layout.firstId;
  /** Chips pulsing for the pinned skill, in reading order. Empty once the pin changes or the timer ends. */
  const pulsing = new Map(
    pulseId !== null && pulseId === selectedId
      ? (graph.nodes[pulseId]?.connections.map((connection, k) => [connection.id, k]) ?? [])
      : [],
  );

  const nodeState = (id: string): NodeState => {
    if (!activeNode) return "idle";
    if (id === activeNode.id) return "active";
    return linked.has(id) ? "linked" : "dim";
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
    const timer = switchTimer;
    const pulse = pulseTimer;
    const frame = dockFrame;
    return () => {
      window.clearTimeout(timer.current);
      window.clearTimeout(pulse.current);
      cancelAnimationFrame(frame.current);
    };
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
      if (document.querySelector("dialog[open], #mobile-menu[data-open]")) return;
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

  /* ---------- Connected chips pulse once after a pin that has no wires to show it ---------- */
  /**
   * Below the desktop width the SVG wiring is hidden, and a finger covers the chip it taps, so
   * the connected chips bloom once in reading order instead. On desktop a mouse pin draws the
   * curved links, so only touch (and keyboard) pins pulse there too.
   */
  const pulseConnections = useCallback(
    (id: string) => {
      window.clearTimeout(pulseTimer.current);
      if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;
      if (window.matchMedia(DESKTOP_QUERY).matches && lastInput.current === "mouse") return;
      const count = graph.nodes[id]?.connections.length ?? 0;
      if (count === 0) return;
      setPulseId(id);
      setPulseRun((run) => run + 1);
      const stagger = Math.min((count - 1) * PULSE_STAGGER_MS, PULSE_STAGGER_CAP_MS);
      pulseTimer.current = window.setTimeout(() => setPulseId(null), PULSE_MS + stagger + 50);
    },
    [graph],
  );

  /* ---------- Skill links anywhere on the page pin their skill ---------- */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest(`a[${SKILL_LINK_ATTR}]`) : null;
      const term = link?.getAttribute(SKILL_LINK_ATTR)?.trim().toLowerCase();
      const id = term ? skillIds.get(term) : undefined;
      // Not a skill on the map: the link only jumps to #skills.
      if (!id) return;
      // A skill on the map: take over the jump and bring its chip into view (a jump to the
      // section top would leave the chip and the panel below the fold), then pin it and focus
      // the chip in place. Mark the input as keyboard-like so the hover that the scroll
      // produces under a resting pointer can't replace the pin; the next real move ends that.
      event.preventDefault();
      // Modern browsers fire click as a PointerEvent; older ones fall back to the pointer capability.
      const pointerType = (event as Partial<globalThis.PointerEvent>).pointerType;
      lastInput.current =
        pointerType === "mouse" || (pointerType === undefined && canHover.current) ? "mouse" : "touch";
      if (window.location.hash !== "#skills") window.history.pushState(null, "", "#skills");
      const reduce = window.matchMedia(REDUCED_MOTION_QUERY).matches;
      document.getElementById(nodeDomId(id))?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
      requestAnimationFrame(() => {
        window.clearTimeout(switchTimer.current);
        keyboardMode.current = true;
        setHoverId(null);
        setFocusId(null);
        setSelectedId(id);
        setLastId(id);
        pulseConnections(id);
        returnFocus(id, skipPreview);
      });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [skillIds, pulseConnections]);

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

  /* ---------- Node handlers ---------- */
  /** Phones and tablets: once a tap has pinned a chip, scroll it clear of the docked panel. */
  const keepClearOfDock = (id: string) => {
    cancelAnimationFrame(dockFrame.current);
    // Next frame: the pinned render has committed and the panel has docked.
    dockFrame.current = requestAnimationFrame(() => {
      if (window.matchMedia(DESKTOP_QUERY).matches) return;
      const panel = panelRef.current;
      const button = document.getElementById(nodeDomId(id));
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
  };

  /** Keyboard use ends any hover preview; hover resumes only once the mouse moves again. */
  const enterKeyboardMode = () => {
    keyboardMode.current = true;
    window.clearTimeout(switchTimer.current);
    setHoverId(null);
  };

  /** Previews a chip: at once when nothing is previewed, otherwise once the pointer rests on it. */
  const preview = (id: string) => {
    window.clearTimeout(switchTimer.current);
    if (hoverId === null || hoverId === id) {
      setHoverId(id);
      return;
    }
    switchTimer.current = window.setTimeout(() => setHoverId(id), HOVER_SWITCH_MS);
  };

  const onPointerEnter = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.pointerType !== "mouse" || !canHover.current) return;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    if (keyboardMode.current) return;
    preview(id);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.pointerType !== "mouse" || !canHover.current) return;
    const last = lastPointer.current;
    // Same position: the page scrolled under a resting pointer (e.g. a keyboard focus scroll).
    if (last && last.x === event.clientX && last.y === event.clientY) return;
    lastPointer.current = { x: event.clientX, y: event.clientY };
    if (!keyboardMode.current) return;
    keyboardMode.current = false;
    preview(id);
  };

  /** Only passing over a chip: the current preview stays. */
  const onPointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "mouse") window.clearTimeout(switchTimer.current);
  };

  /** The preview ends when the pointer leaves the whole graph, info panel included. */
  const onGraphPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    window.clearTimeout(switchTimer.current);
    setHoverId(null);
  };

  const onFocus = (event: FocusEvent<HTMLButtonElement>, id: string) => {
    setLastId(id);
    // Focus moved by script (after a clear, or by a skill link): no preview.
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

  /** Remembers what kind of input is pressing, before the click it produces. */
  const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    lastInput.current = event.pointerType === "mouse" ? "mouse" : "touch";
  };

  const toggle = (id: string) => {
    // A click settles a hover switch that is still waiting, so the panel shows the clicked chip.
    window.clearTimeout(switchTimer.current);
    if (hoverId !== null) setHoverId(id);
    setLastId(id);
    const pinning = selectedId !== id;
    setSelectedId(pinning ? id : null);
    if (pinning) {
      keepClearOfDock(id);
      pulseConnections(id);
    } else {
      window.clearTimeout(pulseTimer.current);
      setPulseId(null);
    }
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
    lastInput.current = "keyboard";
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
      ? activeNode.connections.flatMap((connection, k) => {
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
            return [{ key, k, d: linkPath(from, to, laneA, laneB, obstacles, headsBottom) }];
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
          return [{ key, k, d: arcPath(from, to, side, lane, edge, limit) }];
        })
      : [];

  /* ---------- Copy derived from the data ---------- */
  const projectNames = graph.sources.filter((source) => source.kind === "project").map((source) => source.name);
  const rolePhrases = graph.sources.filter((source) => source.kind === "role").map((source) => source.phrase);
  const sourcesSentence = joinNames([
    ...(projectNames.length > 0 ? [`my projects (${joinNames(projectNames)})`] : []),
    ...rolePhrases,
  ]);

  const gridStyle = {
    "--dna-tracks": layout.totalTracks,
    "--dna-panel-col": layout.panelStart + 1,
    "--dna-panel-span": layout.panelSpan,
  } as CSSProperties;

  return (
    <div className="dna" data-reveal="" style={{ "--dna-wait": `${ENTRANCE_WAIT_MS}ms` } as CSSProperties}>
      <div ref={graphRef} className="dna-graph relative" onPointerLeave={onGraphPointerLeave}>
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
              style={{ "--dna-delay": `${100 + link.order * 110}ms` } as CSSProperties}
            />
          ))}
          {crossLinks.map((link) => (
            <path
              key={link.key}
              d={link.d}
              pathLength={1}
              className="dna-link"
              style={{ "--k": link.k } as CSSProperties}
            />
          ))}
        </svg>

        {/* Hub */}
        <div className="relative z-[1] mb-3 lg:mb-14 lg:flex lg:justify-center">
          <div
            data-dna-hub=""
            className="dna-hub relative flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-2xl border border-line bg-bg-raised/60 p-4 lg:w-fit lg:flex-nowrap lg:rounded-xl lg:border-line-strong lg:bg-surface lg:py-3 lg:pr-5 lg:pl-3.5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-tint/[0.04] text-fg-muted">
              <UserRound aria-hidden="true" focusable="false" className="size-[1.125rem]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="label-mono">{hub.name}</p>
              <p className="font-display text-lg leading-tight font-semibold tracking-[-0.01em] text-fg">{hub.title}</p>
            </div>
            <p className="flex w-full flex-wrap gap-x-4 gap-y-1 border-t border-line pt-2.5 font-mono text-xs leading-4 text-fg-subtle sm:ml-auto sm:block sm:w-auto sm:border-0 sm:pt-0 sm:text-right lg:ml-2 lg:border-l lg:pl-4">
              <span className="block">
                <CountUp value={layout.nodeCount} delay={ENTRANCE_WAIT_MS} duration={COUNT_MS} /> skills
              </span>
              <span className="block">
                <CountUp value={usedCount} delay={ENTRANCE_WAIT_MS} duration={COUNT_MS} /> used in projects or roles
              </span>
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
                  data-reveal=""
                  // Desktop: the columns enter with the explorer, in step with the hub wires.
                  data-reveal-with="(min-width: 64rem)"
                  data-state={domainState(domain)}
                  style={
                    {
                      "--dna-col": domain.trackStart + 1,
                      "--dna-span": domain.lanes.length,
                      "--dna-rows": domain.rows,
                      "--dna-lanes": domain.lanes.length,
                      "--dna-order": domain.order,
                      "--dna-step": `${domain.rippleStep}ms`,
                    } as CSSProperties
                  }
                >
                  <div
                    data-dna-head={domain.id}
                    className="dna-head relative flex items-center gap-2.5"
                    style={{ "--i": 0 } as CSSProperties}
                  >
                    <span className="dna-head-icon grid size-7 shrink-0 place-items-center rounded-md border border-line bg-tint/[0.04] text-fg-muted">
                      <DomainIcon aria-hidden="true" focusable="false" className="size-3.5" strokeWidth={1.75} />
                    </span>
                    <h3
                      id={headingId}
                      className="font-mono text-xs leading-4 font-medium tracking-[0.08em] text-fg uppercase"
                    >
                      {domain.label}
                    </h3>
                    <span aria-hidden="true" className="ml-auto font-mono text-xs text-fg-subtle tabular-nums">
                      <CountUp value={domain.size} delay={ENTRANCE_WAIT_MS} duration={COUNT_MS} />
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
                                  className="dna-row dna-row-label label-mono"
                                  style={rippleStyle(layout.ripple.labels[group.id])}
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
                                  // Order among the connected chips: the link draw, its port, and the pulse follow it.
                                  const k = pulsing.get(id) ?? linked.get(id);
                                  return (
                                    <li
                                      key={id}
                                      className="dna-row"
                                      data-state={state}
                                      data-tier={node.tier}
                                      data-last={id === laneLastId ? "" : undefined}
                                      data-port={state === "linked" ? portSide(id) : undefined}
                                      data-pulse={pulsing.has(id) ? (pulseRun % 2 ? "b" : "a") : undefined}
                                      style={rippleStyle(layout.ripple.nodes[id], k)}
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
                                        onPointerDown={onPointerDown}
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
                                        {descriptions[id]}
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
            role="region"
            aria-label="Skill details"
            className="dna-panel relative rounded-2xl border border-line-strong bg-surface p-4 sm:p-5"
            data-mode={mode}
            data-pinned={selectedNode ? "" : undefined}
            onFocus={onPanelFocus}
            onBlur={onPanelBlur}
          >
            {/* Desktop header: what the panel is showing and how to change it. */}
            <div className="hidden min-h-8 items-center justify-between gap-3 border-b border-line pb-3 lg:flex">
              <p aria-hidden="true" className="label-mono flex items-center gap-2">
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
                  <p aria-hidden="true" className="font-mono text-xs text-fg-subtle">
                    {activeId === hoverId ? (
                      "Click to pin"
                    ) : (
                      <>
                        <kbd className="dna-kbd">Enter</kbd> pins
                      </>
                    )}
                  </p>
                ) : mode === "rest" ? (
                  <p aria-hidden="true" className="font-mono text-xs text-fg-subtle">
                    {graph.sources.length} {graph.sources.length === 1 ? "source" : "sources"}
                  </p>
                ) : null}
                {selectedNode ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    aria-label={`Clear selection: ${selectedNode.name}`}
                    className="dna-clear inline-flex h-7 items-center gap-1.5 rounded-md border border-line px-2 font-mono text-xs text-fg-muted hover:border-line-strong hover:text-fg focus-visible:border-line-strong focus-visible:text-fg"
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
                className="dna-close absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-lg text-fg-muted hover:bg-tint/[0.06] hover:text-fg focus-visible:bg-tint/[0.06] focus-visible:text-fg lg:hidden"
              >
                <X aria-hidden="true" focusable="false" className="size-4" />
              </button>
            ) : null}

            <div className="dna-panel-body lg:pt-4">
              {/* Desktop: an invisible copy of the largest entry shares the cell with the live one,
                  so the panel always fits it and changing the skill never moves the page. */}
              {largest ? (
                <div aria-hidden="true" inert className="dna-sizer">
                  <NodeDetails node={largest} graph={graph} />
                </div>
              ) : null}
              <div className="min-w-0">
                {activeNode ? (
                  // Keyed, so a new skill remounts the entry and the docked panel's lines enter again.
                  <NodeDetails key={activeNode.id} node={activeNode} graph={graph} />
                ) : (
                  <div>
                    <p className="dna-js-only hidden text-[0.9375rem] leading-relaxed text-fg lg:block">
                      Hover, focus or tap a skill to see where it was used.
                    </p>
                    {sourcesSentence ? (
                      <p className="text-sm leading-relaxed text-fg-muted lg:mt-2">
                        Connections show skills used together in {sourcesSentence}.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Key and hints. Phones and tablets: above the domains. Desktop: under the tall columns. */}
          <div className="dna-guide">
            <p className="dna-js-only text-sm leading-snug text-fg-muted lg:hidden">
              <span className="pointer-fine:hidden">Tap</span>
              <span className="hidden pointer-fine:inline">Click</span> a skill to see where it was used.
            </p>
            <ul aria-hidden="true" className={cn("flex", legendClass)}>
              <li className={legendItemClass}>
                <span className="dna-key" />
                Used in my projects or roles
              </li>
              <li className={legendItemClass}>
                <span className="dna-key" data-key="toolkit" />
                Also in my toolkit
              </li>
            </ul>
            <ul aria-hidden="true" className={cn("dna-js-only hidden lg:flex", legendClass)}>
              <li className={legendItemClass}>
                <span className="dna-key" data-key="active" />
                Selected
              </li>
              <li className={legendItemClass}>
                <span className="dna-key" data-key="linked" />
                Connected
              </li>
              <li className={legendItemClass}>
                <span className="dna-key" data-key="dim" />
                Not linked
              </li>
              <li className={legendItemClass}>
                <span className="dna-key-line" />
                Used together
              </li>
            </ul>
            <p
              aria-hidden="true"
              className="dna-js-only hidden flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-xs leading-5 text-fg-subtle lg:pointer-fine:flex"
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
        </div>
      </div>
    </div>
  );
}

/** Inline ripple order for a chip or group label, plus its place among the connected chips. */
function rippleStyle(position: RipplePosition | undefined, k?: number): CSSProperties {
  return {
    "--i": position?.i ?? 0,
    "--j": position?.j ?? 0,
    ...(k !== undefined ? { "--k": k } : {}),
  } as CSSProperties;
}

/** A line of the info panel that enters in sequence (`--i`) when the panel docks on a phone. */
function dockItem(i: number) {
  return { "data-dock-item": "", style: { "--i": i } as CSSProperties };
}

/** Details for the active skill. Facts only: its group, and each place it was used with what. */
function NodeDetails({ node, graph }: { node: DnaNode; graph: TechDnaClientGraph }) {
  const domain = graph.domains.find((item) => item.id === node.domain);
  const usage = usageOf(node, graph);

  return (
    <div>
      <p {...dockItem(0)} className="label-mono pr-10 lg:pr-0">
        {domain && domain.groups.length > 1 ? (
          <>
            {domain.label}
            <span aria-hidden="true"> / </span>
            <span className="sr-only">, </span>
          </>
        ) : null}
        {node.groupLabel}
      </p>
      <p
        {...dockItem(1)}
        className="mt-1 pr-10 font-display text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-fg lg:pr-0 lg:text-2xl"
      >
        {node.name}
      </p>

      {usage.length > 0 ? (
        <dl className="mt-3 lg:mt-4">
          <dt {...dockItem(2)} className="label-mono">
            Used in
          </dt>
          <dd className="mt-1 lg:mt-2">
            <ul className="dna-sources">
              {usage.map(({ source, withNames }, index) => (
                <li key={source.name} {...dockItem(3 + index)}>
                  <a
                    href={source.href}
                    className="dna-source"
                    {...(source.kind === "project" ? { [FROM_SKILL_ATTR]: node.name } : {})}
                  >
                    <span>{source.name}</span>
                    <ArrowRight aria-hidden="true" focusable="false" className="dna-source-icon" />
                  </a>
                  {withNames.length > 0 ? <span className="dna-with"> with {joinNames(withNames)}</span> : null}
                </li>
              ))}
            </ul>
          </dd>
        </dl>
      ) : (
        <p {...dockItem(2)} className="mt-3 text-sm leading-relaxed text-fg-muted lg:mt-4">
          {TOOLKIT_COPY}
        </p>
      )}
    </div>
  );
}
