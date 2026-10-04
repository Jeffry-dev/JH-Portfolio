import type { CSSProperties } from "react";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { experience } from "@/data/experience";
import { projects } from "@/data/projects";
import type { ExperienceItem } from "@/lib/types";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusPill, TagList } from "@/components/ui/tag";
import { experienceAnchor, projectAnchor } from "@/lib/tech-links";
import { cn } from "@/lib/utils";

/** Inline custom properties (the stagger order `--i`). */
type StyleVars = CSSProperties & Record<`--${string}`, number | string>;

function Period({ item, className }: { item: ExperienceItem; className?: string }) {
  return (
    <p className={cn("font-mono text-xs text-fg-subtle", className)}>
      <time dateTime={item.startISO}>{item.start}</time>
      <span aria-hidden="true"> – </span>
      <span className="sr-only"> to </span>
      {item.endISO ? <time dateTime={item.endISO}>{item.end}</time> : <span>{item.end}</span>}
    </p>
  );
}

/** In-page links to the case studies of the projects built in a role. The arrow nudges on hover, focus and press. */
function RoleProjects({ ids }: { ids: string[] }) {
  const linked = ids.flatMap((id) => projects.find((project) => project.id === id) ?? []);
  if (linked.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-x-6">
      {linked.map((project) => (
        <a
          key={project.id}
          href={`#${projectAnchor(project.id)}`}
          className="group/project inline-flex min-h-11 items-center gap-1.5 font-mono text-xs text-accent transition-colors duration-200 hover:text-accent-strong focus-visible:text-accent-strong active:text-accent-strong"
        >
          Project: {project.title}
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform duration-200 group-hover/project:translate-x-0.5 group-focus-visible/project:translate-x-0.5 group-active/project:translate-x-0.5"
          />
        </a>
      ))}
    </div>
  );
}

/**
 * Timeline geometry. Phones and tablets stack the date above each card with the rail on the left;
 * from lg the dates sit in a 14rem gutter and the rail runs between the gutter and the cards.
 * Earlier roles use the same gutter, so every date on the section lines up.
 */
const railPosition = "left-[0.46875rem] lg:left-[calc(14rem+0.46875rem)]";

/**
 * Motion (app/globals.css), all of it scroll-driven so it is the same on a phone as on a desktop:
 * - the rail draws itself as you read down the list (`.rail-fill`);
 * - each marker ignites as it rises into view: scale, opacity and a glow in its own colour
 *   (`.tl-marker`, amber; green for the current role);
 * - the role card nearest the middle of the viewport warms its border (`.tl-card`).
 * Every scrubbed element carries `data-view-progress`, so <ScrollFallback /> can feed the same
 * rules in browsers without CSS scroll timelines. Inside each card the highlights, and below the
 * timeline the earlier roles, stagger in once their reveal plays (`.stagger`, `data-reveal-item`).
 */
export function Experience() {
  const primary = experience.filter((item) => item.kind === "primary");
  const earlier = experience.filter((item) => item.kind === "earlier");

  return (
    <section id="experience" aria-labelledby="experience-label experience-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading
          section="experience"
          title="Where I’ve worked."
          titleId="experience-title"
          description="From a backend development internship to my current role at SmartSource, plus the customer-facing jobs I worked alongside my studies."
        />

        <div className="relative">
          {/* Timeline rail: a faint track, plus an accent fill that draws as you scroll. */}
          <div
            aria-hidden="true"
            data-view-progress=""
            className={cn("absolute top-2 bottom-2 w-px bg-line-strong", railPosition)}
          >
            <div className="rail-fill absolute inset-0 bg-gradient-to-b from-accent via-accent/70 to-accent/20" />
          </div>

          <ol>
            {primary.map((item, index) => (
              <Reveal
                as="li"
                key={item.id}
                id={experienceAnchor(item.id)}
                delay={index * 0.05}
                className="relative grid scroll-mt-4 gap-3 pb-12 pl-7 last:pb-0 sm:pl-9 lg:grid-cols-[14rem_1fr] lg:gap-0 lg:pl-0"
              >
                {/* Node. The text colour is what the ignite glow is drawn in. */}
                <span
                  aria-hidden="true"
                  data-view-progress=""
                  className={cn(
                    "tl-marker absolute top-1.5 left-0 grid size-[0.9375rem] place-items-center rounded-full border bg-bg lg:left-[14rem]",
                    item.current ? "border-ok/50 text-ok" : "border-accent/40 text-accent",
                  )}
                >
                  <span className={cn("size-[0.4375rem] rounded-full", item.current ? "ping bg-ok" : "bg-accent/70")} />
                </span>

                <div className="lg:pt-0.5 lg:pr-8">
                  <Period item={item} />
                  {item.current ? (
                    <p className="mt-2">
                      <StatusPill>Current role</StatusPill>
                    </p>
                  ) : null}
                </div>

                {/* `.tl-card` owns the border colour once it lands: hover and the current role's green tint
                    go through --tl-border there, so the utilities below are the no-stylesheet fallback. */}
                <article
                  data-spotlight
                  data-view-progress=""
                  className={cn(
                    "card spotlight tl-card rounded-2xl p-5 transition-colors duration-200 hover:border-line-strong sm:p-8 lg:ml-10",
                    item.current && "border-ok/15 [--tl-border:color-mix(in_oklab,var(--color-ok)_15%,transparent)]",
                  )}
                >
                  <h3 className="text-[1.375rem] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-2xl">
                    {item.role}
                  </h3>
                  <p className="mt-1.5 flex items-center gap-2 text-[0.9375rem] text-fg-muted">
                    <BriefcaseBusiness aria-hidden="true" className="size-4 text-accent/80" />
                    {item.company}
                  </p>

                  {/* Summary, highlights and tags share one measure, so the card body has one right edge. */}
                  <p className="mt-5 max-w-2xl leading-relaxed text-fg-muted">{item.summary}</p>

                  {item.highlights.length > 0 ? (
                    <Reveal y={0} stagger className="mt-5 max-w-2xl">
                      <ul className="space-y-2.5">
                        {item.highlights.map((highlight, i) => (
                          <li
                            key={highlight}
                            data-reveal-item=""
                            style={{ "--i": i } as StyleVars}
                            className="flex gap-3 text-[0.9375rem] leading-relaxed text-fg-muted"
                          >
                            <span aria-hidden="true" className="mt-[0.6875rem] h-px w-3 shrink-0 bg-accent/70" />
                            <span>{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </Reveal>
                  ) : null}

                  <TagList items={item.tags} label={`${item.role}: related skills`} className="mt-6 max-w-2xl" />

                  {item.projects ? <RoleProjects ids={item.projects} /> : null}
                </article>
              </Reveal>
            ))}
          </ol>
        </div>

        {earlier.length > 0 ? (
          <Reveal className="mt-20 pl-7 sm:pl-9 lg:pl-0">
            <div className="lg:grid lg:grid-cols-[14rem_1fr]">
              <h3 className="eyebrow lg:pt-1">Earlier experience</h3>
              <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-fg-muted lg:mt-0 lg:pl-10">
                Customer-facing roles alongside my studies: fast-paced, high-pressure, team-based work that built
                attention to detail and the ability to manage several tasks at once.
              </p>
            </div>
            {/* The rows follow the intro one after another. */}
            <ul className="stagger mt-6 divide-y divide-line border-y border-line">
              {earlier.map((item, i) => (
                <li
                  key={item.id}
                  id={experienceAnchor(item.id)}
                  data-reveal-item=""
                  style={{ "--i": i } as StyleVars}
                  className="grid scroll-mt-4 gap-1.5 py-5 lg:grid-cols-[14rem_1fr] lg:gap-x-0"
                >
                  {/* Date first, as in the timeline above: above the role on phones, in the gutter from lg. */}
                  <Period item={item} className="lg:row-span-2 lg:pt-1" />
                  <p className="font-display text-[1.0625rem] font-medium tracking-[-0.01em] text-fg lg:pl-10">
                    {item.role}
                    <span className="text-fg-subtle">
                      {" · "}
                      <span className="whitespace-nowrap">{item.company}</span>
                    </span>
                  </p>
                  <p className="text-sm leading-relaxed text-fg-muted lg:col-start-2 lg:pl-10">{item.summary}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}
