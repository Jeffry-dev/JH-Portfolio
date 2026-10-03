import type { CSSProperties } from "react";
import { ArrowDown, ArrowRight, Mail } from "lucide-react";
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
    status: profile.statusCard.status,
    // Same list as the status card, so the hero names one stack.
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
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      className="relative overflow-x-clip pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-6"
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

          <p
            className="rise-y mt-6 font-display text-[clamp(1.375rem,2.6vw,1.875rem)] leading-tight font-medium tracking-[-0.02em] text-fg"
            style={delay(380)}
          >
            {profile.title}
            <span className="block text-fg-subtle">{profile.tagline}</span>
          </p>

          <p className="rise-y mt-5 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg" style={delay(440)}>
            {profile.intro}
          </p>

          <div className="rise mt-9 flex flex-col gap-3 sm:flex-row sm:items-center" style={delay(560)}>
            <Magnetic className="w-full sm:w-auto">
              <ButtonLink href="#projects" variant="primary" className="w-full sm:w-auto">
                View my work
                <ArrowRight aria-hidden="true" className="arrow-turn size-4" />
              </ButtonLink>
            </Magnetic>
            <Magnetic className="w-full sm:w-auto" strength={0.22}>
              <ButtonLink href="#contact" variant="secondary" className="w-full sm:w-auto">
                <Mail aria-hidden="true" className="size-4" />
                Contact me
              </ButtonLink>
            </Magnetic>
            {profile.resumeUrl ? (
              <ButtonLink href={profile.resumeUrl} variant="ghost" target="_blank" rel="noopener noreferrer">
                Download CV
                <span className="sr-only"> (opens in a new tab)</span>
              </ButtonLink>
            ) : null}
          </div>
        </div>

        <div className="hero-depth-visual lg:col-span-5">
          <div className="rise-soft relative" style={delay(420)}>
            <Tilt>
              <Terminal data={terminalData()} />
            </Tilt>
          </div>
        </div>
      </div>

      {/* System status bar: full width under the hero, on every screen size. */}
      <div className="hero-depth-facts container-page mt-14 sm:mt-16 lg:mt-20">
        <div className="rise" style={delay(700)}>
          <StatusCard />
        </div>

        <a
          href="#about"
          className="group mx-auto mt-8 hidden w-fit items-center gap-2 rounded-full px-3 py-2 font-mono text-xs text-fg-subtle transition-colors hover:text-fg lg:flex"
        >
          Scroll to explore
          <ArrowDown aria-hidden="true" className="size-3.5 transition-transform duration-300 group-hover:translate-y-0.5" />
        </a>
      </div>
    </section>
  );
}
