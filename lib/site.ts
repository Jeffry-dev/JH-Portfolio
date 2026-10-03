/**
 * Canonical site URL used for metadata, Open Graph, sitemap and robots.
 *
 * Resolution order:
 * 1. NEXT_PUBLIC_SITE_URL: set this once you have a custom domain (e.g. "https://jeffry.dev").
 *    A value without a scheme ("jeffry.dev") is treated as https.
 * 2. VERCEL_PROJECT_PRODUCTION_URL: provided automatically by Vercel.
 * 3. http://localhost:3000: local development fallback.
 */
function toOrigin(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).origin;
  } catch {
    return null;
  }
}

export const siteUrl =
  toOrigin(process.env.NEXT_PUBLIC_SITE_URL) ??
  toOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  "http://localhost:3000";
