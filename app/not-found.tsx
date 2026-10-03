import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <main id="main" className="container-page flex min-h-dvh flex-col items-start justify-center py-24">
      <p className="eyebrow">Error 404</p>
      <h1 className="mt-5 text-[clamp(2.5rem,7vw,4.5rem)] leading-[0.95] font-semibold tracking-[-0.04em] text-fg">
        This page doesn&apos;t exist.
      </h1>
      <p className="mt-5 max-w-md text-lg text-fg-muted">The link may be broken, or the page may have moved.</p>
      {/* A plain link: a full load of the one-page site keeps next/link out of the home page bundle. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="group mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-6 font-medium text-accent-ink transition-colors hover:bg-accent-strong"
      >
        <ArrowLeft aria-hidden="true" className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to the portfolio
      </a>
    </main>
  );
}
