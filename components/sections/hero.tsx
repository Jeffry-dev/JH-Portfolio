import type { CSSProperties } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { profile } from "@/data/profile";
import { education } from "@/data/education";
import { skillGroups } from "@/data/skills";
import { projects } from "@/data/projects";
import { toTelHref } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button-link";
import { Terminal, type TerminalData } from "@/components/hero/terminal";
import { StatusCard } from "@/components/hero/status-card";
import { KineticName } from "@/components/hero/kinetic-name";
import { Magnetic } from "@/components/motion/magnetic";
import { Tilt } from "@/components/motion/tilt";

/*
 * Entrance timing (CSS keyframes in app/globals.css; the name's own stagger is in kinetic-name.tsx).
 * The name starts first, then title, terminal, intro, buttons and status bar, so the whole hero
 * settles within about 1.2s. The tagline rises a beat after the title, and the status bar's
 * cells follow one another (status-card.tsx), so the hero lands in a cascade rather than at once.
 */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/** Generic entries of the "systems" skill group that the terminal's `ls ./systems` leaves out. */
const GENERIC_SYSTEMS = new Set(["Windows", "Networking", "Troubleshooting"]);

/** Everything the client terminal prints, taken from /data on the server. */
function terminalData(): TerminalData {
  const degree = education.find((item) => item.kind === "degree");

  return {
    user: profile.firstName.toLowerCase(),
    name: profile.name,
    title: profile.title,
    company: profile.current.company,
    status: profile.statusCard.status,
    availability: profile.statusCard.availability,
    // Same list as the status bar, so the hero names one stack.
    stack: profile.statusCard.stack,
    systems: (skillGroups.find((group) => group.id === "systems")?.items ?? []).filter(
      (item) => !GENERIC_SYSTEMS.has(item),
    ),
    about: [
      profile.about.statement,
      `${profile.current.role} at ${profile.current.company} since ${profile.current.since}.`,
      ...(degree ? [`Studying for a ${degree.qualification} at ${degree.institution}.`] : []),
    ],
    skills: skillGroups.map(({ label, items }) => ({ label, items })),
    projects: projects.map(({ id, index, title, category }) => ({ id, index, title, category })),
    contact: {
      email: profile.contact.email,
      phone: profile.contact.phone,
      phoneHref: profile.contact.phone ? toTelHref(profile.contact.phone) : "",
    },
  };
}

export function Hero() {
  // The depth layers (.hero-depth-*) run on the scroll(root) timeline; without CSS scroll
  // timelines they read --scroll-y, written on <html> by components/motion/scroll-fallback.tsx.
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative overflow-x-clip pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-40"
    >
      {/* Local glow behind the terminal */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-24 right-[-10%] -z-10 hidden h-[34rem] w-[46rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-glow)_10%,transparent),transparent)] lg:block"
      />

      <div className="container-page grid items-center gap-12 sm:gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="hero-depth-copy lg:col-span-7">
          <h1
            id="hero-title"
            aria-label={profile.name}
            className="text-[clamp(3.25rem,10vw,7.25rem)] leading-[0.92] font-semibold tracking-[-0.045em] text-fg"
          >
            <KineticName lines={[profile.firstName, profile.lastName]} />
          </h1>

          {/* Role and employer on one line (the employer gets its own line on phones), then the
              tagline. Sized so each stays on one line from 1280px; balanced where they wrap. */}
          <p
            className="rise-y mt-6 font-display text-[clamp(1.375rem,2.4vw,1.75rem)] leading-tight font-medium tracking-[-0.02em] text-balance text-fg"
            style={delay(300)}
          >
            {profile.title}
            <span className="text-fg-muted max-sm:block"> at {profile.current.company}</span>
            {/* Its own rise on top of the title's, so the tagline settles last. */}
            <span className="rise-y block text-fg-subtle" style={delay(380)}>
              {profile.tagline}
            </span>
          </p>

          <p className="rise-y mt-5 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg" style={delay(360)}>
            {profile.intro}
          </p>

          {/* The primary button is the page's only magnetic element. */}
          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(440)}>
            <Magnetic className="w-full sm:w-auto">
              <ButtonLink href="#projects" variant="primary" className="w-full sm:w-auto">
                View projects
                <ArrowRight aria-hidden="true" className="arrow-turn size-4" />
              </ButtonLink>
            </Magnetic>
            <ButtonLink href="#contact" variant="secondary" className="w-full sm:w-auto">
              <Mail aria-hidden="true" className="size-4" />
              Contact me
            </ButtonLink>
            {profile.resumeUrl ? (
              <ButtonLink href={profile.resumeUrl} variant="ghost" target="_blank" rel="noopener noreferrer">
                Download CV
                <span className="sr-only"> (opens in a new tab)</span>
              </ButtonLink>
            ) : null}
          </div>
        </div>

        {/* Decorative and interactive only: every fact in it is on the page, so it is not printed. */}
        <div className="hero-depth-visual lg:col-span-5 print:hidden">
          <div className="rise-soft relative" style={delay(340)}>
            <Tilt max={3}>
              <Terminal data={terminalData()} />
            </Tilt>
          </div>
        </div>
      </div>

      {/* System status bar: full width under the hero, on every screen size. */}
      <div className="hero-depth-facts container-page mt-14 sm:mt-16">
        <div className="rise" style={delay(540)}>
          <StatusCard />
        </div>
      </div>
    </section>
  );
}
