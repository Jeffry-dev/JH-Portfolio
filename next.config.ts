import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is maintained by hand (see the file); stop `next dev` from rewriting it.
  agentRules: false,
};

export default nextConfig;
