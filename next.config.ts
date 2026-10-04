import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  // AGENTS.md is maintained by hand (see the file); stop `next dev` from rewriting it.
  agentRules: false,
};

/** Same sources as lib/site.ts. .env files are already loaded when this runs. */
function hasSiteUrl(): boolean {
  return [process.env.NEXT_PUBLIC_SITE_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL].some((value) => value?.trim());
}

let warned = false;

export default function config(phase: string): NextConfig {
  // Without a site URL, lib/site.ts falls back to localhost and the build bakes it into the
  // canonical link, Open Graph and Twitter images, sitemap and robots. Say so once per build.
  if (phase === PHASE_PRODUCTION_BUILD && !hasSiteUrl() && !warned) {
    warned = true;
    console.warn(
      "\n[site] NEXT_PUBLIC_SITE_URL is not set, so the canonical link, Open Graph images, sitemap and robots.txt " +
        "will point to http://localhost:3000. Set it to the real domain before deploying (see .env.example).\n",
    );
  }
  return nextConfig;
}
