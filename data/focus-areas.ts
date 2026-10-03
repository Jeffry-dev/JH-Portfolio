import type { FocusArea } from "@/lib/types";

/**
 * "What I do": the areas I work across (from the list in my updated information).
 * Descriptions describe skills, not job duties.
 */
export const focusAreas: FocusArea[] = [
  {
    id: "it-systems",
    title: "IT Support & Systems",
    description: "Windows systems and the hands-on troubleshooting that comes with them.",
    icon: "monitor",
    tags: ["Windows", "Troubleshooting"],
    size: "wide",
  },
  {
    id: "windows-server",
    title: "Windows Server",
    description: "Windows Server with Active Directory and Group Policy.",
    icon: "key",
    tags: ["Windows Server", "Active Directory", "Group Policy"],
    size: "regular",
  },
  {
    id: "networking",
    title: "Networking",
    description: "DNS, DHCP and general networking.",
    icon: "network",
    tags: ["DNS", "DHCP", "Networking"],
    size: "regular",
  },
  {
    id: "backend",
    title: "Backend & API Development",
    description:
      "APIs and the business logic behind them. Laravel during my internship, NestJS in later projects.",
    icon: "server-cog",
    tags: ["NestJS", "Laravel", "API development", "Postman"],
    size: "wide",
  },
  {
    id: "web",
    title: "Web Development",
    description: "Front ends for dashboards and web applications.",
    icon: "app-window",
    tags: ["Next.js", "React", "TypeScript", "HTML", "CSS"],
    size: "regular",
  },
  {
    id: "databases",
    title: "Database Systems",
    description: "Database design and SQL for the applications I build.",
    icon: "database",
    tags: ["SQL Server", "SQLite", "SQL"],
    size: "regular",
  },
  {
    id: "software-engineering",
    title: "Software Engineering",
    description:
      "A Computer Science degree in progress at Arab Open University, with Java, Python and C#, and Git-based workflows.",
    icon: "braces",
    tags: ["Java", "Python", "C#", "Git"],
    size: "wide",
  },
  {
    id: "ai",
    title: "AI-assisted Development",
    description: "Claude in my everyday workflow, and an AI chatbot in my graduation project.",
    icon: "sparkles",
    tags: ["Claude", "AI chatbot"],
    size: "wide",
  },
];
