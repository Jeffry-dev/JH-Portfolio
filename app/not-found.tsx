import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ArrowLeft } from "lucide-react";
import { buttonClass } from "@/components/ui/button-link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
  // Not indexed, so no canonical: the root layout's one points at the home page.
  alternates: { canonical: null },
};

/** Entrance stagger, the hero's own (.rise in app/globals.css): eyebrow, heading, text, button. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export default function NotFound() {
  return (
    <main id="main" className="container-page flex min-h-dvh flex-col items-start justify-center py-24">
      <p className="rise eyebrow">Error 404</p>
      <h1
        className="rise mt-5 text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-fg"
        style={delay(80)}
      >
        This page doesn’t exist.
      </h1>
      <p className="rise mt-5 max-w-md text-lg text-fg-muted" style={delay(180)}>
        The link may be broken, or the page may have moved.
      </p>
      {/* A plain link: a full load of the one-page site keeps next/link out of the home page bundle. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className={buttonClass("primary", "rise mt-10")} style={delay(300)}>
        <ArrowLeft
          aria-hidden="true"
          className="size-4 transition-transform duration-300 ease-out-expo group-hover:-translate-x-0.5 group-focus-visible:-translate-x-0.5 group-active:-translate-x-0.5"
        />
        Back to the portfolio
      </a>
    </main>
  );
}
