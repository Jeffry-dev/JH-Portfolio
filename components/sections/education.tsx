import { ArrowRight, Award, BookOpen, GraduationCap, School } from "lucide-react";
import { education } from "@/data/education";
import { certifications } from "@/data/skills";
import type { EducationItem } from "@/lib/types";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/section-heading";

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

export function Education() {
  const degree = education.filter((item) => item.kind === "degree");
  const rest = education.filter((item) => item.kind !== "degree");

  return (
    <section id="education" aria-labelledby="education-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading section="education" title="Education & training." titleId="education-title" />

        <div className="grid gap-4 md:grid-cols-2">
          {degree.map((item) => {
            const IconComponent = kindIcon[item.kind];
            return (
              <Reveal key={item.id} className="md:col-span-2">
                <article
                  data-spotlight
                  className="card spotlight relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-colors duration-300 hover:border-line-strong sm:p-9"
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-glow)_10%,transparent),transparent)]"
                  />
                  <div className="flex items-center justify-between gap-4">
                    <span className="grid size-12 place-items-center rounded-xl border border-accent/30 bg-accent/[0.08] text-accent">
                      <IconComponent aria-hidden="true" className="size-6" strokeWidth={1.6} />
                    </span>
                    <p className="font-mono text-xs text-fg-subtle">{item.period}</p>
                  </div>

                  <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-end lg:gap-12">
                    <div>
                      <p className="eyebrow">{kindLabel[item.kind]}</p>
                      <h3 className="mt-3 max-w-xl text-[clamp(1.625rem,3vw,2.25rem)] leading-[1.1] font-semibold tracking-[-0.025em] text-fg">
                        {item.qualification}
                      </h3>
                      <p className="mt-2 text-lg text-fg-muted">{item.institution}</p>
                    </div>

                    {item.note ? (
                      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-tint/[0.02] p-5">
                        <p className="text-[0.9375rem] text-fg">{item.note}</p>
                        {item.noteLink ? (
                          <a
                            href={item.noteLink.href}
                            className="group/note inline-flex min-h-11 w-fit items-center gap-1.5 font-mono text-xs text-accent transition-colors hover:text-accent-strong"
                          >
                            {item.noteLink.label}
                            <ArrowRight
                              aria-hidden="true"
                              className="size-3.5 transition-transform duration-200 group-hover/note:translate-x-0.5"
                            />
                          </a>
                        ) : null}
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
              <Reveal key={item.id} delay={0.06 * (index + 1)}>
                <article
                  data-spotlight
                  className="card spotlight flex h-full flex-col rounded-2xl p-7 transition-colors duration-300 hover:border-line-strong"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="grid size-10 place-items-center rounded-xl border border-line bg-tint/[0.03] text-fg-muted">
                      <IconComponent aria-hidden="true" className="size-5" strokeWidth={1.6} />
                    </span>
                    <p className="font-mono text-xs text-fg-subtle">{item.period}</p>
                  </div>
                  <p className="eyebrow mt-8">{kindLabel[item.kind]}</p>
                  <h3 className="mt-2.5 text-xl leading-snug font-semibold tracking-[-0.015em] text-fg">
                    {item.qualification}
                  </h3>
                  <p className="mt-1 text-fg-muted">{item.institution}</p>
                  {item.note ? <p className="mt-4 text-sm leading-relaxed text-fg-subtle">{item.note}</p> : null}
                </article>
              </Reveal>
            );
          })}
        </div>

        {certifications.length > 0 ? (
          <Reveal className="mt-12">
            <h3 className="eyebrow">Certifications</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {certifications.map((cert) => (
                <li key={cert.name} className="card flex items-start gap-3 rounded-2xl p-5">
                  <Award aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-accent" strokeWidth={1.6} />
                  <div>
                    <p className="font-medium text-fg">
                      {cert.url ? (
                        <a href={cert.url} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
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
