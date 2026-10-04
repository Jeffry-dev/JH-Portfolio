import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Bricolage_Grotesque, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { profile } from "@/data/profile";
import { siteUrl } from "@/lib/site";
import { Backdrop } from "@/components/layout/backdrop";
import { RevealObserver } from "@/components/motion/reveal-observer";
import { AmbientCursor } from "@/components/motion/ambient-cursor";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const sans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
});

// Only used for small labels, so it loads without competing with the critical path.
const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const title = `${profile.name} | ${profile.title}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: `%s | ${profile.name}`,
  },
  description: profile.seoDescription,
  applicationName: profile.name,
  authors: [{ name: profile.name, url: siteUrl }],
  creator: profile.name,
  keywords: [
    profile.name,
    "IT Specialist",
    "Beirut",
    "Lebanon",
    "Windows Server",
    "Active Directory",
    "Networking",
    "Next.js",
    "NestJS",
    "Laravel",
    "SQL Server",
    "Portfolio",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "profile",
    url: "/",
    siteName: profile.name,
    title,
    description: profile.seoDescription,
    locale: "en_US",
    firstName: profile.firstName,
    lastName: profile.lastName,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: profile.seoDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08090b" },
    { media: "(prefers-color-scheme: light)", color: "#f5f4ef" },
  ],
  colorScheme: "dark light",
};

/**
 * Runs before first paint:
 * - applies the saved theme, or the OS setting, so there is no flash of the wrong theme;
 * - marks the document as JS-enabled so reveal animations may hide content, and shows
 *   everything anyway if the reveal script hasn't started within 4s.
 */
const bootScript = `(function(){var d=document.documentElement;var t;try{t=localStorage.getItem("theme")}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.dataset.theme=t;d.classList.add("js");setTimeout(function(){if(!d.dataset.revealReady)d.classList.add("reveal-fallback")},4000)})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body className="min-h-dvh">
        <a
          href="#main"
          className="sr-only z-[100] rounded-full bg-accent px-5 py-3 font-medium text-accent-ink focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:px-5 focus:py-3"
        >
          Skip to content
        </a>
        <div
          aria-hidden="true"
          className="scroll-progress fixed inset-x-0 top-0 z-[60] h-0.5 bg-gradient-to-r from-accent/0 via-accent to-accent-strong"
        />
        <Backdrop />
        <AmbientCursor />
        {children}
        <RevealObserver />
      </body>
    </html>
  );
}
