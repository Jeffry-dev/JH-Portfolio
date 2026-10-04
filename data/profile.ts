import type { Profile } from "@/lib/types";

/**
 * Personal + contact information.
 * Source: CV (contact details, education) + updated information (current role).
 */
export const profile: Profile = {
  name: "Jeffry Harfouche",
  firstName: "Jeffry",
  lastName: "Harfouche",
  title: "IT Specialist",
  tagline: "Full-stack development, IT support & networking",
  intro:
    "I build full-stack web applications with Next.js, NestJS, TypeScript and SQL Server, and my systems skills cover Windows Server, Active Directory and networking. Currently studying Computer Science at Arab Open University.",
  seoDescription:
    "Jeffry Harfouche, IT Specialist in Beirut: full-stack development with Next.js, NestJS, TypeScript and SQL Server, plus IT support, Windows Server, Active Directory and networking.",
  location: {
    city: "Beirut",
    country: "Lebanon",
  },
  current: {
    role: "IT Specialist",
    company: "SmartSource Consulting SAL",
    since: "Nov 2025",
  },
  statusCard: {
    // Factual. `availability` gets the green "live" dot; remove it when it stops being true.
    status: "Working at SmartSource Consulting SAL",
    availability: "Open to opportunities",
    stack: ["Next.js", "NestJS", "SQL Server"],
  },
  contact: {
    email: "jeffryharfouche@hotmail.com",
    phone: "+961 76 451 699",
  },
  socials: {
    // TODO: add your real profile URLs. Empty values are hidden on the site.
    github: "",
    linkedin: "",
  },
  // TODO: add an up-to-date CV to /public and set its path here (e.g. "/jeffry-harfouche-cv.pdf").
  resumeUrl: "",
  about: {
    statement: "I work where IT infrastructure meets software.",
    paragraphs: [
      "I’m based in Beirut and work as an IT Specialist at SmartSource Consulting SAL, while studying for a B.Sc. in Computer Science at Arab Open University. I’ve always had a strong interest in learning and keeping up with technology, and today my work covers both how software gets built and how systems run.",
      "Most of my work at SmartSource is software development: I’m part of the team building SmartHub, the company’s attendance and billing platform, where I work across the frontend and the backend. I also handle IT support, including basic networking and troubleshooting.",
      "I built Market Desk, a trading and financial market dashboard, on my own from end to end with Next.js, NestJS, TypeScript and SQL Server. My graduation project, a Lebanese restaurant web app with an AI chatbot, is built with Laravel and PHP, and I did a backend internship at XpertBot Academy working with Laravel, databases, Git and API development. On the systems side, my skills cover Windows Server, Active Directory, Group Policy, DNS and DHCP, and I use AI-assisted tools like Claude as part of how I work.",
      "Alongside my studies I’ve also worked customer-facing jobs in event catering, food service and an amusement center. They taught me to work under pressure in fast-paced environments, pay attention to detail and work as part of a team.",
    ],
  },
};
