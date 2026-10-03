"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// The feature bundle is fetched after hydration. Nothing above the fold needs it.
const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Lazily loads Motion's DOM animation features (used by the mobile menu)
 * and makes every Motion animation honour the OS "reduce motion" setting.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
