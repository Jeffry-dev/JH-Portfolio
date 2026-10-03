/**
 * Shared content types for the portfolio.
 * All editable content lives in /data. Components only render it.
 */

export type SocialKey = "github" | "linkedin";

export interface Profile {
  name: string;
  firstName: string;
  lastName: string;
  title: string;
  /** One-line positioning statement shown under the title in the hero. */
  tagline: string;
  /** Short hero paragraph. */
  intro: string;
  /** Used for <meta name="description"> and social previews. */
  seoDescription: string;
  location: {
    city: string;
    country: string;
  };
  current: {
    role: string;
    company: string;
    since: string;
  };
  /**
   * Hero status card + terminal "status" command. Keep every value factual.
   * `status` is shown next to a live dot, e.g. "Working at SmartSource Consulting SAL".
   * Only change it to something like "Open to opportunities" if that is true.
   */
  statusCard: {
    status: string;
    focus: string[];
    stack: string[];
  };
  contact: {
    email: string;
    /** E.164-ish display format. Set to "" to hide the phone number everywhere. */
    phone: string;
  };
  /**
   * Leave a value as "" until you have a real URL. Empty links are hidden automatically.
   * Never put a guessed URL here.
   */
  socials: Record<SocialKey, string>;
  /** Public path or absolute URL to an up-to-date CV (e.g. "/jeffry-harfouche-cv.pdf"). "" hides the button. */
  resumeUrl: string;
  about: {
    statement: string;
    paragraphs: string[];
  };
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  /** Display format, e.g. "Nov 2025". */
  start: string;
  /** Display format, or "Present". */
  end: string;
  /** ISO-ish date used for <time dateTime>. */
  startISO: string;
  endISO?: string;
  current?: boolean;
  /** "primary" roles get the full card; "earlier" roles are listed compactly. */
  kind: "primary" | "earlier";
  summary: string;
  highlights: string[];
  tags: string[];
}

export interface ArchitectureNode {
  label: string;
  detail: string;
  icon: IconName;
}

export interface ProjectLink {
  label: string;
  href: string;
  kind: "live" | "repo" | "case-study";
}

export interface Project {
  id: string;
  index: string;
  title: string;
  category: string;
  context: string;
  summary: string;
  /** Capabilities of the system. Only what is actually known; may be empty. */
  features: string[];
  stack: string[];
  /** Left-to-right flow rendered as a schematic. */
  architecture: ArchitectureNode[];
  /** Optional side modules rendered under the schematic. */
  modules?: string[];
  /** Add real URLs only. With an empty array only the "Ask me about" link is shown. */
  links: ProjectLink[];
  /** Case study: what the project is for, in plain words. Leave undefined if unknown. */
  purpose?: string;
  /** Case study: e.g. "Completed". Leave undefined if unknown; it is hidden then. */
  status?: string;
  /** Optional screenshot in /public. Leave undefined to use the schematic visual. */
  image?: { src: string; alt: string; width: number; height: number };
}

export interface SkillGroup {
  id: string;
  label: string;
  items: string[];
}

export interface FocusArea {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  tags: string[];
  /** Bento sizing on large screens. */
  size: "wide" | "regular";
}

export interface EducationItem {
  id: string;
  qualification: string;
  institution: string;
  period: string;
  kind: "degree" | "school" | "training";
  note?: string;
  noteLink?: { label: string; href: string };
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

/** Icons are referenced by name so data files stay serialisable and server-friendly. */
export type IconName =
  | "server"
  | "server-cog"
  | "network"
  | "database"
  | "code"
  | "braces"
  | "bot"
  | "sparkles"
  | "shield"
  | "key"
  | "monitor"
  | "app-window"
  | "layers"
  | "terminal"
  | "git"
  | "wrench"
  | "chart"
  | "users"
  | "receipt"
  | "utensils"
  | "message";
