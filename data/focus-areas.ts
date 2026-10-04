import type { FocusArea } from "@/lib/types";

/**
 * "What I do": the areas I work across (from the list in my updated information).
 * Descriptions describe skills and confirmed work, never invented duties. Development comes
 * first because it is most of my current job.
 */
export const focusAreas: FocusArea[] = [
  {
    id: "backend",
    title: "Backend & API Development",
    description:
      "APIs and the business logic behind them: NestJS in Market Desk and SmartHub, Laravel in my internship and graduation project.",
    icon: "server-cog",
    size: "wide",
  },
  {
    id: "web",
    title: "Web Development",
    description: "Front ends for dashboards and web applications, with Next.js, React and TypeScript.",
    icon: "app-window",
    size: "regular",
  },
  {
    id: "databases",
    title: "Database Systems",
    description: "Database design and SQL for the applications I build, on SQL Server and SQLite.",
    icon: "database",
    size: "regular",
  },
  {
    id: "it-systems",
    title: "IT Support & Systems",
    description: "IT support, troubleshooting and basic networking, backed by Windows and Windows Server skills.",
    icon: "monitor",
    size: "wide",
  },
  {
    id: "windows-server",
    title: "Windows Server",
    description: "Windows Server with Active Directory and Group Policy.",
    icon: "key",
    size: "regular",
  },
  {
    id: "networking",
    title: "Networking",
    description: "DNS, DHCP and general networking.",
    icon: "network",
    size: "regular",
  },
  {
    id: "software-engineering",
    title: "Software Engineering",
    description:
      "A Computer Science degree in progress at Arab Open University, with Java, Python and C#, and Git-based workflows.",
    icon: "braces",
    size: "wide",
  },
  {
    id: "ai",
    title: "AI-assisted Development",
    description: "AI-assisted development with Claude, and an AI chatbot in my graduation project.",
    icon: "sparkles",
    size: "wide",
  },
];
