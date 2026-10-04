import type { ExperienceItem } from "@/lib/types";

/**
 * Work history, newest first.
 * Source: CV + updated information (SmartSource role from Nov 2025, confirmed by the owner:
 * mostly development on SmartHub, plus IT support with basic networking; Amusement Center job
 * ended Nov 2025).
 */
export const experience: ExperienceItem[] = [
  {
    id: "smartsource",
    role: "IT Specialist",
    company: "SmartSource Consulting SAL",
    start: "Nov 2025",
    end: "Present",
    startISO: "2025-11",
    current: true,
    kind: "primary",
    summary:
      "Mostly software development, as part of the team building SmartHub, the company’s attendance and billing platform. I also handle IT support, including basic networking.",
    highlights: [
      "Full-stack development in the SmartHub team, working across the Next.js frontend and the backend.",
      "IT support and troubleshooting for the company, including basic networking.",
    ],
    tags: ["Full-stack development", "IT support", "Networking", "Troubleshooting"],
    projects: ["smarthub"],
  },
  {
    id: "xpertbot",
    role: "Web Development Intern",
    company: "XpertBot Academy",
    start: "Mar 2025",
    end: "Aug 2025",
    startISO: "2025-03",
    endISO: "2025-08",
    kind: "primary",
    summary: "Backend development internship built around a structured training program.",
    highlights: [
      "Completed a structured backend development training program, gaining hands-on experience with Laravel, databases, Git and API development.",
      "Tested APIs with Postman and applied backend workflow practices.",
      "Developed the ability to work independently and adapt to new technologies.",
    ],
    tags: ["Laravel", "PHP", "Databases", "API development", "Postman", "Git"],
  },
  {
    id: "amusement-center",
    role: "Customer Service / Cash Handling",
    company: "Amusement Center",
    start: "Feb 2025",
    end: "Nov 2025",
    startISO: "2025-02",
    endISO: "2025-11",
    kind: "earlier",
    summary:
      "Assisted customers in a fast-paced environment and handled cash transactions accurately.",
    highlights: [
      "Assisted customers efficiently in a fast-paced environment.",
      "Managed cash transactions accurately with close attention to detail.",
      "Collaborated with team members to keep daily operations running smoothly.",
    ],
    tags: [],
  },
  {
    id: "bleumz",
    role: "Waiter",
    company: "Bleumz Catering",
    start: "Jun 2023",
    end: "Sep 2024",
    startISO: "2023-06",
    endISO: "2024-09",
    kind: "earlier",
    summary:
      "Customer service at high-pressure events, coordinating with the team to keep service on time.",
    highlights: [
      "Provided customer service at high-pressure events.",
      "Coordinated with team members to ensure timely service.",
      "Managed multiple tasks efficiently while keeping attention to detail.",
    ],
    tags: [],
  },
  {
    id: "mcdonalds",
    role: "Cashier",
    company: "McDonald’s",
    start: "Aug 2022",
    end: "Dec 2022",
    startISO: "2022-08",
    endISO: "2022-12",
    kind: "earlier",
    summary: "Handled customer transactions quickly and accurately as part of a team.",
    highlights: [
      "Handled customer transactions quickly and accurately.",
      "Maintained a clean and organized workspace.",
      "Collaborated with team members to keep daily operations running smoothly.",
    ],
    tags: [],
  },
];
