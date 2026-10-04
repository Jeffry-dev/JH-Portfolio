import type { CSSProperties } from "react";
import { ArrowRight, Award, BookOpen, GraduationCap, School } from "lucide-react";
import { education } from "@/data/education";
import { certifications } from "@/data/skills";
import type { EducationItem } from "@/lib/types";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

/** Inline custom properties (the stagger order `--i`). */
type StyleVars = CSSProperties & Record<`--${string}`, number | string>;

const kindIcon = {
  degree: GraduationCap,
  training: BookOpen,
  school: School,
} as const;

const kindLabel: Record<EducationItem["kind"], string> = {
  degree: "University",
  training: "Training",
  school: "High school",
};

/** In-page link under a note (the graduation project, the internship). The arrow nudges on hover, focus and press. */
function NoteLink({ link, className }: { link: NonNullable<EducationItem["noteLink"]>; className?: string }) {
  return (
    <a
      href={link.href}
      className={cn(
        "group/note inline-flex min-h-11 w-fit items-center gap-1.5 font-mono text-xs text-accent transition-colors duration-200 hover:text-accent-strong focus-visible:text-accent-strong active:text-accent-strong",
        className,
      )}
    >
      {link.label}
      <ArrowRight
        aria-hidden="true"
        className="size-3.5 transition-transform duration-200 group-hover/note:translate-x-0.5 group-focus-visible/note:translate-x-0.5 group-active/note:translate-x-0.5"
      />
    </a>
  );
}

/**
 * Low-motion section: each card fades in without a rise (its own reveal, so on a phone every
 * card plays as it scrolls into view), and inside it the icon tile pops in, then the date, the
 * title block and the note follow in sequence (`.stagger`, `data-reveal-item` in app/globals.css).
 * The cards have no pointer spotlight, only a border change on hover.
 */
export function Education() {
  const degree = education.filter((item) => item.kind === "degree");
  const rest = education.filter((item) => item.kind !== "degree");

  return (
    <section id="education" aria-labelledby="education-label education-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading section="education" title="Education & training." titleId="education-title" />

        <div className="grid gap-4 md:grid-cols-2">
          {degree.map((item) => {
            const IconComponent = kindIcon[item.kind];
            return (
              <Reveal key={item.id} y={0} className="md:col-span-2">
                {/* isolate: keeps the decorative glow (-z-10) above the card's own background. */}
                <article className="card stagger relative isolate flex h-full flex-col overflow-hidden rounded-2xl p-5 transition-colors duration-200 hover:border-line-strong sm:p-7 lg:p-9">
                  {/* The glow blooms in with the tile. */}
                  <div
                    aria-hidden="true"
                    data-reveal-item="pop"
                    style={{ "--i": 1 } as StyleVars}
                    className="pointer-events-none absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-glow)_10%,transparent),transparent)]"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <span
                      data-reveal-item="pop"
                      style={{ "--i": 0 } as StyleVars}
                      className="grid size-12 place-items-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent"
                    >
                      <IconComponent aria-hidden="true" className="size-6" />
                    </span>
                    <p data-reveal-item="" style={{ "--i": 1 } as StyleVars} className="font-mono text-xs text-fg-subtle">
                      {item.period}
                    </p>
                  </div>

                  <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-end lg:gap-12">
                    <div data-reveal-item="" style={{ "--i": 2 } as StyleVars}>
                      <p className="label-mono">{kindLabel[item.kind]}</p>
                      <h3 className="mt-3 max-w-xl text-[clamp(1.75rem,3vw,2.375rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-fg">
                        {item.qualification}
                      </h3>
                      <p className="mt-2 text-lg text-fg-muted">{item.institution}</p>
                    </div>

                    {item.note ? (
                      <div
                        data-reveal-item=""
                        style={{ "--i": 3 } as StyleVars}
                        className="flex flex-col gap-3 rounded-2xl border border-line bg-tint/[0.02] p-5"
                      >
                        <p className="text-[0.9375rem] text-fg">{item.note}</p>
                        {item.noteLink ? <NoteLink link={item.noteLink} /> : null}
                      </div>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            );
          })}

          {rest.map((item, index) => {
            const IconComponent = kindIcon[item.kind];
            return (
              <Reveal key={item.id} y={0} delay={0.06 * (index + 1)}>
                <article className="card stagger flex h-full flex-col rounded-2xl p-5 transition-colors duration-200 hover:border-line-strong sm:p-7">
                  <div className="flex items-center justify-between gap-4">
                    <span
                      data-reveal-item="pop"
                      style={{ "--i": 0 } as StyleVars}
                      className="grid size-10 place-items-center rounded-xl border border-line bg-tint/[0.03] text-fg-muted"
                    >
                      <IconComponent aria-hidden="true" className="size-5" />
                    </span>
                    <p data-reveal-item="" style={{ "--i": 1 } as StyleVars} className="font-mono text-xs text-fg-subtle">
                      {item.period}
                    </p>
                  </div>
                  {/* Label, title and institution share one beat; the note and its link take the next. */}
                  <p data-reveal-item="" style={{ "--i": 2 } as StyleVars} className="label-mono mt-8">
                    {kindLabel[item.kind]}
                  </p>
                  <h3
                    data-reveal-item=""
                    style={{ "--i": 2 } as StyleVars}
                    className="mt-2.5 text-xl leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[1.375rem]"
                  >
                    {item.qualification}
                  </h3>
                  <p data-reveal-item="" style={{ "--i": 2 } as StyleVars} className="mt-1 text-fg-muted">
                    {item.institution}
                  </p>
                  {item.note ? (
                    <p data-reveal-item="" style={{ "--i": 3 } as StyleVars} className="mt-4 text-sm leading-relaxed text-fg-subtle">
                      {item.note}
                    </p>
                  ) : null}
                  {item.noteLink ? (
                    <div data-reveal-item="" style={{ "--i": 3 } as StyleVars} className="mt-1 flex">
                      <NoteLink link={item.noteLink} />
                    </div>
                  ) : null}
                </article>
              </Reveal>
            );
          })}
        </div>

        {certifications.length > 0 ? (
          <Reveal y={0} className="mt-12">
            <h3 className="eyebrow">Certifications</h3>
            <ul className="stagger mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {certifications.map((cert, i) => (
                <li
                  key={cert.name}
                  data-reveal-item=""
                  style={{ "--i": i } as StyleVars}
                  className="card flex items-start gap-3 rounded-2xl p-5"
                >
                  <Award aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" />
                  <div>
                    <p className="font-medium text-fg">
                      {cert.url ? (
                        <a
                          href={cert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline-offset-4 hover:underline focus-visible:underline active:underline"
                        >
                          {cert.name}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        cert.name
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-fg-muted">
                      {cert.issuer} · {cert.date}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
