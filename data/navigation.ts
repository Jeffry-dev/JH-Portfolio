export interface SectionMeta {
  id: string;
  label: string;
  /** Two-digit number shown in the section eyebrow and in the mobile menu. */
  index: string;
  /** Whether the section gets a link in the desktop navbar pill. Contact has its own button. */
  desktopNav: boolean;
}

/**
 * Every page section, in order. `id` must match the section element's id.
 * Projects come before Skills so the Technical DNA recaps work the reader has just seen.
 */
export const sections: SectionMeta[] = [
  { id: "about", label: "About", index: "01", desktopNav: true },
  { id: "what-i-do", label: "What I do", index: "02", desktopNav: false },
  { id: "experience", label: "Experience", index: "03", desktopNav: true },
  { id: "projects", label: "Projects", index: "04", desktopNav: true },
  { id: "skills", label: "Skills", index: "05", desktopNav: true },
  { id: "education", label: "Education", index: "06", desktopNav: false },
  { id: "contact", label: "Contact", index: "07", desktopNav: false },
];

export function getSection(id: string): SectionMeta {
  const section = sections.find((item) => item.id === id);
  if (!section) throw new Error(`Unknown section id: ${id}`);
  return section;
}
