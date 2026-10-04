import type { Project } from "@/lib/types";

/**
 * Featured projects, written as short case studies.
 * Only facts that were actually provided or confirmed are listed here, plus what follows by
 * definition from the stack (e.g. Next.js and NestJS are both TypeScript frameworks).
 * No invented metrics, users, results or reasons.
 *
 * Optional fields render only when filled: `purpose`, `status`, `decisions` (technical
 * decisions with their reasons, in your words), `links` and `image`.
 */
export const projects: Project[] = [
  {
    id: "market-desk",
    index: "01",
    title: "Market Desk",
    category: "Market dashboard",
    role: "Solo project, designed and built end to end",
    summary:
      "A modern dashboard for trading and financial markets, built as a full-stack TypeScript application.",
    // TODO (owner): add 2 or 3 neutral descriptions of what the dashboard lets you do (no data,
    // accuracy or performance claims), and any `decisions` you want to explain.
    features: [],
    stack: ["Next.js", "React", "NestJS", "TypeScript", "SQL Server"],
    approach:
      "TypeScript on both sides: a Next.js and React frontend and a NestJS API, with Microsoft SQL Server as the database. The frontend talks to the API, and the API talks to the database.",
    architecture: [
      {
        label: "Frontend",
        detail: "Next.js",
        icon: "chart",
        description:
          "The dashboard interface, built with Next.js and React in TypeScript. It gets its data from the API.",
      },
      {
        label: "API",
        detail: "NestJS",
        icon: "server-cog",
        description:
          "A NestJS API in TypeScript that sits between the dashboard and the database.",
      },
      {
        label: "Database",
        detail: "SQL Server",
        icon: "database",
        description: "Microsoft SQL Server holds the application’s data, behind the API.",
      },
    ],
    links: [],
  },
  {
    id: "smarthub",
    index: "02",
    title: "SmartHub",
    category: "Attendance & billing platform",
    context: "Built at SmartSource Consulting SAL",
    role: "Team project, full-stack across the frontend and the backend",
    summary:
      "A company platform for attendance and billing. It processes employee activity and attendance, provides reporting, and runs its business logic on the backend.",
    features: ["Employee activity and attendance processing", "Reporting", "Backend business logic"],
    stack: ["Next.js", "React", "NestJS", ".NET", "SQL Server"],
    approach:
      "A Next.js web interface on top of a backend built with NestJS and .NET, where the business logic runs, with Microsoft SQL Server as the database. The interface talks to the backend, and the backend talks to the database.",
    // TODO (owner): confirm how NestJS and .NET split the backend before describing it further.
    architecture: [
      {
        label: "Frontend",
        detail: "Next.js",
        icon: "app-window",
        description: "The platform’s web interface, built with Next.js and React.",
      },
      {
        label: "Backend",
        detail: "NestJS · .NET",
        icon: "server-cog",
        description:
          "The backend, built with NestJS and .NET. The business logic runs here, including attendance processing and reporting.",
      },
      {
        label: "Database",
        detail: "SQL Server",
        icon: "database",
        description: "Microsoft SQL Server holds the platform’s data, behind the backend.",
      },
    ],
    modules: ["Attendance processing", "Reporting", "Business logic"],
    links: [],
  },
  {
    id: "restaurant-menu-ai",
    index: "03",
    title: "Lebanese Restaurant Menu AI",
    shortTitle: "Restaurant Menu AI",
    category: "Graduation project",
    context: "B.Sc. Computer Science · Arab Open University",
    role: "Solo project, built end to end",
    summary:
      "A complete academic software project: a web application for a Lebanese restaurant’s menu, with an AI chatbot for visitors and an admin side.",
    features: [
      "AI chatbot for visitors",
      "Menu management with menu metadata",
      "Admin functionality for managing the site",
      "Contact messages from visitors",
      "Visitor and chat interaction tracking",
    ],
    stack: ["Laravel", "PHP", "SQLite", "JavaScript", "HTML", "CSS"],
    approach:
      "A server-side Laravel application written in PHP, with an HTML, CSS and JavaScript front end. SQLite is the database: it keeps all the data in a single file, with no separate database server to run.",
    // TODO (owner): name the AI service behind the chatbot if you want it shown.
    architecture: [
      {
        label: "Web UI",
        detail: "HTML · CSS · JS",
        icon: "utensils",
        description:
          "The pages visitors and the admin use, built with HTML, CSS and JavaScript. Visitors use the AI chatbot here.",
      },
      {
        label: "Application",
        detail: "Laravel · PHP",
        icon: "server-cog",
        description:
          "The Laravel application in PHP: menu management, the admin side, contact messages and interaction tracking.",
      },
      {
        label: "Database",
        detail: "SQLite",
        icon: "database",
        description: "SQLite keeps the application’s data in a single file, with no separate database server.",
      },
    ],
    modules: ["AI chatbot", "Admin panel", "Interaction tracking"],
    links: [],
  },
];
