import type { EducationItem } from "@/lib/types";

/**
 * Education and training.
 * Source: CV. Dates are exactly as listed there. Update `period` once you graduate.
 */
export const education: EducationItem[] = [
  {
    id: "aou",
    qualification: "Bachelor of Science in Computer Science",
    institution: "Arab Open University",
    period: "2023 – Present",
    kind: "degree",
    note: "Graduation project: Lebanese Restaurant Menu AI",
    noteLink: { label: "View graduation project", href: "#project-restaurant-menu-ai" },
  },
  {
    id: "xpertbot-training",
    qualification: "Backend Development Training Program",
    institution: "XpertBot Academy",
    period: "Mar 2025 – Aug 2025",
    kind: "training",
    note: "Laravel, databases, Git and API development, completed as part of my internship.",
  },
  {
    id: "chafic-souhaid",
    qualification: "Lebanese Baccalaureate (General Science)",
    institution: "Chafic Souhaid High School",
    period: "2022 – 2023",
    kind: "school",
  },
];
