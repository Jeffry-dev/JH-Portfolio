import { experience } from "@/data/experience";
import { projects } from "@/data/projects";
import { skillGroups } from "@/data/skills";
import { experienceAnchor, projectAnchor } from "@/lib/tech-links";

/**
 * Technical DNA: the Skills section drawn as a graph.
 *
 * Everything here is derived from data/skills.ts, data/projects.ts and data/experience.ts,
 * so editing those files updates the graph. The only words written here are the domain
 * labels and the noun a sentence uses for each role.
 *
 * - Nodes: every skill item, exactly once, sorted into four domains.
 * - Sources: each project's `stack`, plus the `tags` of the roles listed in
 *   `experienceSources` (the XpertBot internship and the SmartSource role). Only terms that
 *   name a skill count; the others (e.g. ".NET", "IT support") are left out.
 * - Edges: two nodes are linked when they appear together in at least one source.
 * - Tier: a skill that appears in at least one source is "used"; the others (e.g. "Windows
 *   Server", which no project or role on the site lists) are "toolkit" and get no edges.
 *   The tier only says whether the site shows where a skill was used. It is never a level.
 */

export type DnaDomainId = "systems" | "software" | "data" | "workflow";

export interface DnaSource {
  /**
   * Display name: the project title, or "<role>, <company>" for a role.
   * Also the value stored in `usedIn` and `sharedIn`.
   */
  name: string;
  kind: "project" | "role";
  /** How a sentence refers to it, e.g. "Market Desk" or "my internship at XpertBot Academy". */
  phrase: string;
  /** In-page anchor of the project case study or the Experience entry. */
  href: string;
}

export interface DnaGroup {
  /** Skill group id from data/skills.ts. */
  id: string;
  /** Skill group label from data/skills.ts, e.g. "Frontend". */
  label: string;
  /** Used skills first, then toolkit skills, each in data/skills.ts order. */
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

/** "used": appears in at least one project stack or role. "toolkit": listed as a skill only. */
export type DnaTier = "used" | "toolkit";

export interface DnaNode {
  id: string;
  name: string;
  domain: DnaDomainId;
  groupId: string;
  groupLabel: string;
  tier: DnaTier;
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
  /** Lower-cased alternative spelling -> node id, e.g. "sql server" -> "microsoft-sql-server". */
  aliases: Record<string, string>;
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
 * Skill links elsewhere on the page (lib/tech-links.ts) resolve through this map too.
 */
const aliases = new Map<string, string>([["SQL Server", "Microsoft SQL Server"]]);

/**
 * Roles from data/experience.ts whose `tags` count as sources. `noun` is how a sentence
 * refers to the role ("my internship at XpertBot Academy").
 */
const experienceSources = [
  { experienceId: "xpertbot", noun: "internship" },
  { experienceId: "smartsource", noun: "role" },
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
          tier: "toolkit",
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
      phrase: project.title,
      href: `#${projectAnchor(project.id)}`,
      terms: project.stack,
    })),
    ...experienceSources.flatMap(({ experienceId, noun }) => {
      const item = experience.find((entry) => entry.id === experienceId);
      if (!item) return [];
      return [
        {
          name: `${item.role}, ${item.company}`,
          kind: "role" as const,
          phrase: `my ${noun} at ${item.company}`,
          href: `#${experienceAnchor(item.id)}`,
          terms: item.tags,
        },
      ];
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

    for (const id of ids) {
      nodes[id].usedIn.push(source.name);
      nodes[id].tier = "used";
    }

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

  // Used skills lead each group, so every list reads the same way: solid chips, then dashed.
  // Array.prototype.sort is stable, so each tier keeps the order of data/skills.ts. `rank` (and
  // with it the order of connections) is unchanged.
  const tierOrder = (id: string) => (nodes[id].tier === "used" ? 0 : 1);
  for (const domain of domains) {
    for (const group of domain.groups) group.nodeIds.sort((a, b) => tierOrder(a) - tierOrder(b));
  }

  const sources = sourceDefinitions.map(({ name, kind, phrase, href }) => ({ name, kind, phrase, href }));

  const aliasIds: Record<string, string> = {};
  for (const [term, skill] of aliases) {
    const id = idByName.get(skill);
    if (id) aliasIds[term.toLowerCase()] = id;
  }

  return { domains, nodes, edges, sources, aliases: aliasIds };
}

export const techDna: TechDnaGraph = buildTechDna();
