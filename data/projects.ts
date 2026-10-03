import type { Project } from "@/lib/types";

/**
 * Featured projects.
 * Only facts that were actually provided are listed here. No invented metrics or claims.
 * Add real URLs to `links` when a repository or live demo becomes public.
 */
export const projects: Project[] = [
  {
    id: "market-desk",
    index: "01",
    title: "Market Desk",
    category: "Market dashboard",
    context: "Trading & financial markets",
    summary:
      "A trading and financial market dashboard, built as a full-stack TypeScript application.",
    // TODO: add 2–3 neutral descriptions of what the dashboard lets you do (no data/accuracy claims).
    features: [],
    stack: ["Next.js", "React", "NestJS", "TypeScript", "SQL Server"],
    architecture: [
      { label: "Frontend", detail: "Next.js", icon: "chart" },
      { label: "API", detail: "NestJS", icon: "server-cog" },
      { label: "Database", detail: "SQL Server", icon: "database" },
    ],
    // TODO: add `purpose` (what problem it solves) and `status` once you want them shown.
    links: [],
  },
  {
    id: "smarthub",
    index: "02",
    title: "SmartHub",
    category: "Attendance & billing platform",
    context: "Company platform",
    summary: "A company platform for employee attendance and billing.",
    features: ["Employee activity and attendance processing", "Reporting", "Backend business logic"],
    stack: ["Next.js", "NestJS", ".NET", "SQL Server"],
    // TODO: confirm how NestJS and .NET split the backend, and your role on the platform.
    architecture: [
      { label: "Frontend", detail: "Next.js", icon: "app-window" },
      { label: "Backend", detail: "NestJS · .NET", icon: "server-cog" },
      { label: "Database", detail: "SQL Server", icon: "database" },
    ],
    modules: ["Attendance processing", "Reporting", "Business logic"],
    // TODO: add `purpose` (the problem it solves, in your words) and `status` (e.g. "In use", "In development") if you want it shown.
    links: [],
  },
  {
    id: "restaurant-menu-ai",
    index: "03",
    title: "Lebanese Restaurant Menu AI",
    category: "Graduation project",
    context: "B.Sc. Computer Science · Arab Open University",
    summary: "A complete web application for a Lebanese restaurant.",
    features: [
      "AI chatbot for visitors",
      "Menu management with menu metadata",
      "Admin functionality for managing the site",
      "Contact messages from visitors",
      "Visitor and chat interaction tracking",
    ],
    stack: ["Laravel", "PHP", "SQLite", "JavaScript", "HTML", "CSS"],
    architecture: [
      { label: "Web UI", detail: "HTML · CSS · JS", icon: "utensils" },
      { label: "Application", detail: "Laravel · PHP", icon: "server-cog" },
      { label: "Database", detail: "SQLite", icon: "database" },
    ],
    modules: ["AI chatbot", "Admin panel", "Interaction tracking"],
    // TODO: add `purpose` (the problem it solves, in your words) if you want it shown.
    status: "Completed",
    links: [],
  },
];
