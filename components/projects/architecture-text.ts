/**
 * Text helpers shared by the architecture diagram (server) and its explorer (client).
 * Plain functions with no React or DOM use, so both sides can import them.
 */

/** "NestJS · .NET" is read as "NestJS, .NET" by screen readers. */
export function spoken(detail: string): string {
  return detail.split(" · ").join(", ");
}

/**
 * Whether `text` names the technology `term` as a whole word: "Next.js" in "built with Next.js
 * and React", ".NET" in "NestJS · .NET", but not "Java" in "JavaScript". Case-sensitive, since
 * technology names are proper nouns.
 */
export function mentions(text: string, term: string): boolean {
  const name = term.trim();
  if (!name) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^\\w.])${escaped}(?!\\w)`).test(text);
}

/** Same technology under two spellings, e.g. the stack's "SQL Server" and the skill "Microsoft SQL Server". */
export function sameTech(a: string, b: string): boolean {
  return a === b || mentions(a, b) || mentions(b, a);
}
