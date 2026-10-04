/**
 * Cross-links between sections, shared so every part of the page builds them the same way.
 *
 * Skill links point at the Technical DNA. Without JavaScript they simply jump to #skills.
 * With JavaScript, the DNA listens for clicks on `[data-skill]` links anywhere on the page
 * and selects (pins) that skill once the jump lands, so the visitor sees where it was used.
 * `term` is the skill's display name exactly as written in data/skills.ts or a project stack
 * ("SQL Server" also matches the "Microsoft SQL Server" skill through the DNA alias).
 */
export const SKILL_LINK_ATTR = "data-skill";

/**
 * Set on Technical DNA "Used in" links that lead to a project. The project case reads it and
 * marks the matching stack chip and architecture nodes, so the visitor sees what the skill did there.
 */
export const FROM_SKILL_ATTR = "data-from-skill";

export function skillLinkProps(term: string) {
  return { href: "#skills", [SKILL_LINK_ATTR]: term } as const;
}

/** DOM id of a role in the Experience section, e.g. "experience-smartsource". */
export function experienceAnchor(id: string): string {
  return `experience-${id}`;
}

/** DOM id of a project case study, e.g. "project-market-desk". */
export function projectAnchor(id: string): string {
  return `project-${id}`;
}
