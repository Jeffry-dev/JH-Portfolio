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
  tagline: "Systems, networking & software development",
  intro:
    "I work across Windows systems, directory services and networking, and I build full-stack web applications with Next.js, NestJS, Laravel and SQL Server. Currently studying Computer Science at Arab Open University.",
  seoDescription:
    "Jeffry Harfouche, IT Specialist in Beirut: Windows Server, Active Directory, networking and full-stack apps with Next.js, NestJS, Laravel and SQL Server.",
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
    // Factual status. Change to e.g. "Open to new opportunities" only if that is true.
    status: "Working at SmartSource Consulting SAL",
    focus: ["Systems", "Software", "Web"],
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
      "I'm based in Beirut and work as an IT Specialist at SmartSource Consulting SAL, while studying for a B.Sc. in Computer Science at Arab Open University. I've always had a strong interest in learning and keeping up with technology, and that has grown into work that covers both how systems run and how software gets built.",
      "On the systems side, I work with Windows and Windows Server, Active Directory, Group Policy, DNS, DHCP and networking, along with the troubleshooting that comes with all of them.",
      "On the development side, my path started with a backend internship at XpertBot Academy, working with Laravel, databases, Git and API development. Since then I've built full-stack projects with Next.js, NestJS, TypeScript and SQL Server, including a market dashboard and an attendance and billing platform. I also use AI-assisted tools like Claude as part of how I work.",
      "Alongside my studies I've also worked customer-facing jobs in event catering, food service and an amusement center. They taught me to work under pressure in fast-paced environments, pay attention to detail and work as part of a team.",
    ],
  },
};
