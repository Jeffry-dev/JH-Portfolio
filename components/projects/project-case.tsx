import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/types";
import { Tag } from "@/components/ui/tag";
import { ArchitectureDiagram } from "@/components/projects/architecture-diagram";
import { cn } from "@/lib/utils";

interface ProjectCaseProps {
  project: Project;
  /** On large screens, put the architecture on the left (zig-zag layout). */
  flipped?: boolean;
}

/** One labelled row of the case study (mono label, then content; side by side when wide). */
function CaseRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-line py-4 last:pb-1 @xl/body:grid-cols-[7rem_minmax(0,1fr)] @xl/body:gap-6">
      <dt className="font-mono text-[0.6875rem] leading-4 tracking-[0.08em] text-fg-subtle uppercase @xl/body:leading-[1.625rem]">
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/**
 * A project as a short technical case study: header, architecture, labelled details, actions.
 * Below lg everything stacks in that order; on lg+ the copy and the architecture sit side by side
 * and alternate sides from one project to the next. Hover and focus states live in
 * styles/architecture.css (`.case-study`).
 */
export function ProjectCase({ project, flipped = false }: ProjectCaseProps) {
  const titleId = `project-${project.id}-title`;
  const hasVisual = Boolean(project.image) || project.architecture.length > 0;

  const copyCol = !hasVisual ? "lg:col-span-2" : flipped ? "lg:col-start-2" : "lg:col-start-1";
  // On lg+ the visual's grid area spans the three copy rows, but the panel keeps its own height
  // (self-start) and stays in view beside the copy while the reader scrolls through it (sticky).
  const visualClass = cn(
    "lg:sticky lg:top-28 lg:row-[1/span_3] lg:self-start",
    flipped ? "lg:col-start-1" : "lg:col-start-2",
  );

  return (
    <article
      data-spotlight
      aria-labelledby={titleId}
      className="case-study card spotlight grid grid-cols-1 gap-y-6 rounded-3xl p-4 sm:p-6 lg:grid-cols-2 lg:grid-rows-[auto_1fr_auto] lg:gap-x-10 lg:p-8 xl:gap-x-12 xl:p-10"
    >
      {/* Header */}
      <header className={cn("lg:row-start-1", copyCol)}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="eyebrow flex items-center gap-3">
            <span className="case-index inline-block text-accent">{project.index}</span>
            <span aria-hidden="true" className="h-px w-6 shrink-0 bg-line-strong" />
            <span>{project.category}</span>
          </p>
          {project.status ? (
            <p className="inline-flex items-center gap-1.5 rounded-full border border-ok/25 bg-ok/[0.08] px-2.5 py-1 font-mono text-[0.6875rem] leading-none text-ok">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ok" />
              <span className="sr-only">Status: </span>
              {project.status}
            </p>
          ) : null}
        </div>

        <h3
          id={titleId}
          className="case-title mt-4 font-display text-[clamp(1.75rem,3vw,2.375rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-fg"
        >
          {project.title}
        </h3>
        <p className="mt-2.5 font-mono text-xs leading-relaxed text-fg-subtle">{project.context}</p>
      </header>

      {/* Architecture (or a real screenshot, if one is provided). Second on small screens. */}
      {project.image ? (
        <div className={cn("overflow-hidden rounded-2xl border border-line bg-bg-raised", visualClass)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- A plain <img> keeps this optional screenshot from shipping the next/image client runtime to the home page; width, height and lazy loading are set by hand. */}
          <img
            src={project.image.src}
            alt={project.image.alt}
            width={project.image.width}
            height={project.image.height}
            loading="lazy"
            decoding="async"
            className="h-auto w-full"
          />
        </div>
      ) : (
        <ArchitectureDiagram project={project} className={visualClass} />
      )}

      {/* Details */}
      <dl className={cn("@container/body lg:row-start-2", copyCol)}>
        <CaseRow label="Overview">
          <p className="max-w-[62ch] leading-relaxed text-fg-muted">{project.summary}</p>
        </CaseRow>

        {project.purpose ? (
          <CaseRow label="Purpose">
            <p className="max-w-[62ch] leading-relaxed text-fg-muted">{project.purpose}</p>
          </CaseRow>
        ) : null}

        {project.features.length > 0 ? (
          <CaseRow label="Features">
            <ul className="max-w-[62ch] space-y-2">
              {project.features.map((feature) => (
                <li key={feature} className="flex gap-3 text-[0.9375rem] leading-6 text-fg-muted">
                  <span aria-hidden="true" className="mt-3 h-px w-3 shrink-0 bg-accent/70" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CaseRow>
        ) : null}

        {project.stack.length > 0 ? (
          <CaseRow label="Stack">
            <ul className="flex flex-wrap gap-1.5 @xl/body:pt-0.5">
              {project.stack.map((item, k) => (
                <li key={item} style={{ "--k": k } as CSSProperties}>
                  <Tag className="case-chip">{item}</Tag>
                </li>
              ))}
            </ul>
          </CaseRow>
        ) : null}
      </dl>

      {/* Actions */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line pt-3 lg:row-start-3",
          copyCol,
        )}
      >
        {project.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-fg underline decoration-line-strong underline-offset-[5px] transition-colors duration-200 hover:decoration-accent"
          >
            {link.label}
            <span className="sr-only"> for {project.title} (opens in a new tab)</span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 text-fg-muted transition-transform duration-300 ease-out-expo group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5"
            />
          </a>
        ))}

        <a href="#contact" className="group/ask inline-flex min-h-11 items-center gap-3 text-[0.9375rem] font-medium text-fg">
          <span className="underline decoration-line-strong underline-offset-[5px] transition-colors duration-200 group-hover/ask:decoration-accent group-focus-visible/ask:decoration-accent">
            Ask me about {project.title}
          </span>
          <span
            aria-hidden="true"
            className="case-ask-icon grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-fg-muted group-hover/ask:border-accent/60 group-hover/ask:text-accent group-focus-visible/ask:border-accent/60 group-focus-visible/ask:text-accent"
          >
            <ArrowRight className="size-4 transition-transform duration-300 ease-out-expo group-hover/ask:-rotate-45 group-focus-visible/ask:-rotate-45" />
          </span>
        </a>
      </div>
    </article>
  );
}
