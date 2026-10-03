import type { Certification, SkillGroup } from "@/lib/types";

/**
 * Technical skills, grouped from infrastructure to application code.
 * Source: CV (Java, Python, C#, HTML, CSS, Laravel, SQLite, Git, Bash, Postman, API development)
 * + updated information (Next.js, React, TypeScript, JavaScript, NestJS, PHP, SQL Server, SQL,
 *   database design, IT / Systems, GitHub, Claude / AI-assisted development).
 * .NET is shown on the SmartHub project rather than here. Add it if you want it listed as a skill.
 * No proficiency percentages on purpose.
 */
export const skillGroups: SkillGroup[] = [
  {
    id: "systems",
    label: "IT & Systems",
    items: [
      "Windows",
      "Windows Server",
      "Active Directory",
      "Group Policy",
      "DNS",
      "DHCP",
      "Networking",
      "Troubleshooting",
    ],
  },
  {
    id: "databases",
    label: "Databases",
    items: ["Microsoft SQL Server", "SQLite", "SQL", "Database design"],
  },
  {
    id: "backend",
    label: "Backend",
    items: ["NestJS", "Laravel", "API development"],
  },
  {
    id: "frontend",
    label: "Frontend",
    items: ["Next.js", "React", "HTML", "CSS"],
  },
  {
    id: "languages",
    label: "Languages",
    items: ["TypeScript", "JavaScript", "PHP", "C#", "Java", "Python", "Bash"],
  },
  {
    id: "tools",
    label: "Tools & Workflow",
    items: ["Git", "GitHub", "Postman", "Claude / AI-assisted development"],
  },
];

/**
 * Certifications: none listed yet, so the section is hidden.
 * Add entries here and they will appear automatically in the Education section.
 */
export const certifications: Certification[] = [];
