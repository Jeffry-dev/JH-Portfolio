import { experience } from "@/data/experience";
import { projects } from "@/data/projects";
import { skillGroups } from "@/data/skills";

/**
 * Technical DNA: the Skills section drawn as a graph.
 *
 * Everything here is derived from data/skills.ts, data/projects.ts and data/experience.ts,
 * so editing those files updates the graph. Nothing in this file is hand-written content.
 *
 * - Nodes: every skill item, exactly once, sorted into four domains.
 * - Sources: each project's `stack`, plus the `tags` of the roles listed in
 *   `experienceSources` (the XpertBot internship and the SmartSource IT Specialist role).
 * - Edges: two nodes are linked when they appear together in at least one source.
 *   Skills that never appear in a source (e.g. "Windows", which no project or role lists)
 *   get no edges; they relate only as members of their domain.
 */

export type DnaDomainId = "systems" | "software" | "data" | "workflow";

export interface DnaSource {
  /** Display name. Also the value stored in `usedIn` and `sharedIn`. */
  name: string;
  kind: "project" | "experience";
  /** In-page anchor where the source is described. */
  href: string;
}

export interface DnaGroup {
  /** Skill group id from data/skills.ts. */
  id: string;
  /** Skill group label from data/skills.ts, e.g. "Frontend". */
  label: string;
  nodeIds: string[];
}

export interface DnaDomain {
  id: DnaDomainId;
  label: string;
  groups: DnaGroup[];
  /** Desktop layout: group ids split into side-by-side lanes (one lane = one grid track). */
  lanes: string[][];
  /** Number of technologies in the domain. */
  size: number;
}

export interface DnaConnection {
  /** The connected node. */
  id: string;
  /** Names of the sources both technologies appear in. */
  sharedIn: string[];
}

export interface DnaNode {
  id: string;
  name: string;
  domain: DnaDomainId;
  groupId: string;
  groupLabel: string;
  /** Names of the sources this technology appears in (projects and roles). */
  usedIn: string[];
  /** Other technologies that share at least one source with this one. */
  connections: DnaConnection[];
}

export interface DnaEdge {
  source: string;
  target: string;
  /** Names of the sources both technologies appear in. */
  sharedIn: string[];
}

export interface TechDnaGraph {
  /** In display order: Systems, Software, Data, Workflow. */
  domains: DnaDomain[];
  nodes: Record<string, DnaNode>;
  edges: DnaEdge[];
  sources: DnaSource[];
}

interface DomainDefinition {
  id: DnaDomainId;
  label: string;
  /** Skill group ids from data/skills.ts, in display order. */
  groups: string[];
  /** Optional desktop lanes (group ids). Defaults to one lane holding every group. */
  lanes?: string[][];
}

const domainDefinitions: DomainDefinition[] = [
  { id: "systems", label: "Systems", groups: ["systems"] },
  {
    id: "software",
    label: "Software",
    groups: ["backend", "frontend", "languages"],
    // Two lanes keep the tallest domain close to the others in height.
    lanes: [["backend", "frontend"], ["languages"]],
  },
  { id: "data", label: "Data", groups: ["databases"] },
  { id: "workflow", label: "Workflow", groups: ["tools"] },
];

/** Skill groups added to data/skills.ts later, without a domain above, are shown here. */
const fallbackDomain: DnaDomainId = "software";

/**
 * Source term -> skill name, for technologies a project or role spells differently.
 * Anything not listed must match a skill name exactly. Intentionally unmapped:
 * ".NET" (in the SmartHub stack, but not a listed skill) and "Databases" (an internship
 * tag that is broader than, and not the same as, "Database design").
 */
const aliases = new Map<string, string>([["SQL Server", "Microsoft SQL Server"]]);

/** Roles from data/experience.ts whose `tags` count as sources, and how the graph names them. */
const experienceSources = [
  { experienceId: "xpertbot", name: "XpertBot internship" },
  { experienceId: "smartsource", name: "IT Specialist role, SmartSource Consulting SAL" },
];

function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/#/g, "sharp")
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "node";
}

function buildTechDna(): TechDnaGraph {
  const groupsById = new Map(skillGroups.map((group) => [group.id, group]));

  // Copy the definitions so unassigned groups can be appended without mutating the constant.
  const definitions = domainDefinitions.map((definition) => ({
    ...definition,
    groups: [...definition.groups],
    lanes: (definition.lanes ?? [definition.groups]).map((lane) => [...lane]),
  }));
  const assigned = new Set(definitions.flatMap((definition) => definition.groups));
  const fallback = definitions.find((definition) => definition.id === fallbackDomain);
  for (const group of skillGroups) {
    if (assigned.has(group.id) || !fallback) continue;
    fallback.groups.push(group.id);
    fallback.lanes[fallback.lanes.length - 1].push(group.id);
  }

  const nodes: Record<string, DnaNode> = {};
  const idByName = new Map<string, string>();
  const rank = new Map<string, number>();

  const domains: DnaDomain[] = [];
  for (const definition of definitions) {
    const groups: DnaGroup[] = [];
    for (const groupId of definition.groups) {
      const group = groupsById.get(groupId);
      if (!group) continue;
      const nodeIds: string[] = [];
      for (const item of group.items) {
        const name = item.trim();
        // Every skill appears exactly once, in the first group that lists it.
        if (!name || idByName.has(name)) continue;
        let id = slugify(name);
        for (let suffix = 2; nodes[id]; suffix++) id = `${slugify(name)}-${suffix}`;
        nodes[id] = {
          id,
          name,
          domain: definition.id,
          groupId: group.id,
          groupLabel: group.label,
          usedIn: [],
          connections: [],
        };
        idByName.set(name, id);
        rank.set(id, rank.size);
        nodeIds.push(id);
      }
      if (nodeIds.length > 0) groups.push({ id: group.id, label: group.label, nodeIds });
    }

    const present = new Set(groups.map((group) => group.id));
    const lanes = definition.lanes
      .map((lane) => lane.filter((groupId) => present.has(groupId)))
      .filter((lane) => lane.length > 0);
    const size = groups.reduce((total, group) => total + group.nodeIds.length, 0);
    if (size > 0) domains.push({ id: definition.id, label: definition.label, groups, lanes, size });
  }

  const sourceDefinitions: Array<DnaSource & { terms: string[] }> = [
    ...projects.map((project) => ({
      name: project.title,
      kind: "project" as const,
      href: `#project-${project.id}`,
      terms: project.stack,
    })),
    ...experienceSources.flatMap(({ experienceId, name }) => {
      const item = experience.find((entry) => entry.id === experienceId);
      return item ? [{ name, kind: "experience" as const, href: "#experience", terms: item.tags }] : [];
    }),
  ];

  const byRank = (a: string, b: string) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0);
  const edgeMap = new Map<string, DnaEdge>();

  for (const source of sourceDefinitions) {
    const ids = [
      ...new Set(
        source.terms
          .map((term) => idByName.get(aliases.get(term.trim()) ?? term.trim()))
          .filter((id): id is string => Boolean(id)),
      ),
    ].sort(byRank);

    for (const id of ids) nodes[id].usedIn.push(source.name);

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const key = `${ids[i]}|${ids[j]}`;
        const edge = edgeMap.get(key) ?? { source: ids[i], target: ids[j], sharedIn: [] };
        edge.sharedIn.push(source.name);
        edgeMap.set(key, edge);
      }
    }
  }

  const edges = [...edgeMap.values()];
  for (const edge of edges) {
    nodes[edge.source].connections.push({ id: edge.target, sharedIn: [...edge.sharedIn] });
    nodes[edge.target].connections.push({ id: edge.source, sharedIn: [...edge.sharedIn] });
  }
  for (const node of Object.values(nodes)) {
    node.connections.sort((a, b) => byRank(a.id, b.id));
  }

  const sources = sourceDefinitions.map(({ name, kind, href }) => ({ name, kind, href }));

  return { domains, nodes, edges, sources };
}

export const techDna: TechDnaGraph = buildTechDna();
