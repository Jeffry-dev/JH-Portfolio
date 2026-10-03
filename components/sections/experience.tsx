import { BriefcaseBusiness } from "lucide-react";
import { experience } from "@/data/experience";
import type { ExperienceItem } from "@/lib/types";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { TagList } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

function Period({ item, className }: { item: ExperienceItem; className?: string }) {
  return (
    <p className={cn("font-mono text-xs tracking-wide text-fg-subtle", className)}>
      <time dateTime={item.startISO}>{item.start}</time>
      <span aria-hidden="true"> – </span>
      <span className="sr-only"> to </span>
      {item.endISO ? <time dateTime={item.endISO}>{item.end}</time> : <span>{item.end}</span>}
    </p>
  );
}

/** Left offset of the timeline rail: column width + half the node size. */
const railPosition = "left-[0.46875rem] md:left-[calc(12rem+0.46875rem)] lg:left-[calc(14rem+0.46875rem)]";

export function Experience() {
  const primary = experience.filter((item) => item.kind === "primary");
  const earlier = experience.filter((item) => item.kind === "earlier");

  return (
    <section id="experience" aria-labelledby="experience-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading
          section="experience"
          title="Where I've worked."
          titleId="experience-title"
          description="From backend training to my current IT role, plus the customer-facing jobs I worked alongside my studies."
        />

        <div className="relative">
          {/* Timeline rail: a faint track, plus an accent fill that draws as you scroll. */}
          <div aria-hidden="true" className={cn("absolute top-2 bottom-2 w-px bg-line-strong", railPosition)}>
            <div className="rail-fill absolute inset-0 bg-gradient-to-b from-accent via-accent/70 to-accent/20" />
          </div>

          <ol>
            {primary.map((item, index) => (
              <Reveal
                as="li"
                key={item.id}
                delay={index * 0.05}
                className="relative grid gap-3 pb-12 pl-7 last:pb-0 sm:pl-9 md:grid-cols-[12rem_1fr] md:gap-0 md:pl-0 lg:grid-cols-[14rem_1fr]"
              >
                {/* Node */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1.5 left-0 grid size-[0.9375rem] place-items-center rounded-full border bg-bg md:left-[12rem] lg:left-[14rem]",
                    item.current ? "border-ok/50" : "border-accent/40",
                  )}
                >
                  <span className={cn("size-[0.4375rem] rounded-full", item.current ? "ping bg-ok" : "bg-accent/70")} />
                </span>

                <div className="md:pt-0.5 md:pr-8">
                  <Period item={item} />
                  {item.current ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-ok/25 bg-ok/[0.08] px-2 py-0.5 font-mono text-[0.6875rem] text-ok">
                      Current role
                    </p>
                  ) : null}
                </div>

                <article
                  data-spotlight
                  className={cn(
                    "card spotlight rounded-2xl p-5 transition-colors duration-300 hover:border-line-strong sm:p-8 md:ml-10",
                    item.current && "border-ok/15",
                  )}
                >
                  <h3 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
                    {item.role}
                  </h3>
                  <p className="mt-1.5 flex items-center gap-2 text-[0.9375rem] text-fg-muted">
                    <BriefcaseBusiness aria-hidden="true" className="size-4 text-accent/80" />
                    {item.company}
                  </p>

                  <p className="mt-5 max-w-2xl leading-relaxed text-fg-muted">{item.summary}</p>

                  {item.highlights.length > 0 ? (
                    <ul className="mt-5 space-y-2.5">
                      {item.highlights.map((highlight) => (
                        <li key={highlight} className="flex gap-3 text-[0.9375rem] leading-relaxed text-fg-muted">
                          <span aria-hidden="true" className="mt-[0.6875rem] h-px w-3 shrink-0 bg-accent/70" />
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <TagList items={item.tags} label={`${item.role}: related skills`} className="mt-6" />
                </article>
              </Reveal>
            ))}
          </ol>
        </div>

        {earlier.length > 0 ? (
          <Reveal className="mt-20 md:ml-[12rem] md:pl-10 lg:ml-[14rem]">
            <h3 className="eyebrow">Earlier experience</h3>
            <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-fg-muted">
              Customer-facing roles alongside my studies: fast-paced, high-pressure, team-based work that built
              attention to detail and the ability to manage several tasks at once.
            </p>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {earlier.map((item) => (
                <li key={item.id} className="grid gap-1.5 py-5 sm:grid-cols-[1fr_auto] sm:gap-x-8">
                  <p className="font-display text-[1.0625rem] font-medium tracking-[-0.01em] text-fg">
                    {item.role}
                    <span className="text-fg-subtle">
                      {" · "}
                      <span className="whitespace-nowrap">{item.company}</span>
                    </span>
                  </p>
                  <Period item={item} className="sm:row-span-2 sm:pt-1 sm:text-right" />
                  <p className="text-sm leading-relaxed text-fg-muted">{item.summary}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
