import type { CSSProperties, ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/types";
import { ArchitectureDiagram } from "@/components/projects/architecture-diagram";
import { Reveal } from "@/components/motion/reveal";
import { StatusPill, Tag } from "@/components/ui/tag";
import { skillGroups } from "@/data/skills";
import { skillLinkProps } from "@/lib/tech-links";
import { cn } from "@/lib/utils";

interface ProjectCaseProps {
  project: Project;
  /** On large screens, put the architecture on the left (zig-zag layout). */
  flipped?: boolean;
}

type StyleVars = CSSProperties & Record<`--${string}`, number | string>;

const prose = "max-w-[62ch] leading-relaxed text-fg-muted";

/**
 * Stack terms that exist on the Technical DNA map, so their chips can link there. ".NET", for
 * example, is only on a project stack, so its chip stays a plain tag instead of a dead link.
 * "SQL Server" is the DNA's alias for "Microsoft SQL Server".
 */
const mappedSkills = new Set([...skillGroups.flatMap((group) => group.items), "SQL Server"].map((t) => t.toLowerCase()));

/**
 * One labelled row of the case study (mono label, then content; side by side when wide).
 * `index` is the row's place in the stagger: rows fade and rise one after another (60 ms
 * apart) once the card reveals, through the `.stagger` utility in app/globals.css.
 */
function CaseRow({ index, label, children }: { index: number; label: string; children: ReactNode }) {
  return (
    <div
      data-reveal-item=""
      style={{ "--i": index } as StyleVars}
      className="grid gap-2 border-t border-line py-4 last:pb-1 @xl/body:grid-cols-[7rem_minmax(0,1fr)] @xl/body:gap-6"
    >
      <dt className="label-mono @xl/body:leading-[1.625rem]">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/**
 * A project as a short technical case study: header, architecture, labelled details, actions.
 * Rows render only when their data exists, in this order: Overview, Role, Purpose, Key
 * features, Approach, Decisions, Stack. Stack chips link to the skill in the Technical DNA.
 * Below lg everything stacks in that order; on lg+ the copy and the architecture sit side by side
 * and alternate sides from one project to the next.
 *
 * Motion (styles/architecture.css): when the card reveals, the index slides in from the left,
 * the eyebrow rule draws, the title rises, the rows stagger in, the feature dashes draw and the
 * stack chips follow 40 ms apart; then a soft light band (`.case-sheen`) sweeps across the card
 * once. Hover, focus and tap states live there too (`.case-study`, `.case-chip`).
 */
export function ProjectCase({ project, flipped = false }: ProjectCaseProps) {
  const titleId = `project-${project.id}-title`;
  const hasVisual = Boolean(project.image) || project.architecture.length > 0;
  const decisions = project.decisions ?? [];

  const copyCol = !hasVisual ? "lg:col-span-2" : flipped ? "lg:col-start-2" : "lg:col-start-1";
  // On lg+ the visual's grid area spans the three copy rows, but the panel keeps its own height
  // (self-start) and stays in view beside the copy while the reader scrolls through it (sticky).
  const visualClass = cn(
    "lg:sticky lg:top-28 lg:row-[1/span_3] lg:self-start print:static",
    flipped ? "lg:col-start-1" : "lg:col-start-2",
  );

  /** The rows that have content, in reading order; their position is the stagger index. */
  const rows: Array<{ label: string; content: ReactNode }> = [
    { label: "Overview", content: <p className={prose}>{project.summary}</p> },
  ];

  if (project.role) {
    rows.push({ label: "Role", content: <p className="max-w-[62ch] leading-relaxed text-fg">{project.role}</p> });
  }

  if (project.purpose) {
    rows.push({ label: "Purpose", content: <p className={prose}>{project.purpose}</p> });
  }

  if (project.features.length > 0) {
    rows.push({
      label: "Key features",
      content: (
        <ul className="max-w-[62ch] space-y-2">
          {project.features.map((feature, j) => (
            <li
              key={feature}
              className="flex gap-3 text-[0.9375rem] leading-6 text-fg-muted"
              style={{ "--j": j } as StyleVars}
            >
              <span aria-hidden="true" className="case-dash mt-3 h-px w-3 shrink-0 bg-accent/70" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (project.approach) {
    rows.push({ label: "Approach", content: <p className={prose}>{project.approach}</p> });
  }

  if (decisions.length > 0) {
    rows.push({
      label: "Decisions",
      content: (
        <ul className="max-w-[62ch] space-y-3">
          {decisions.map((decision) => (
            <li key={decision.title}>
              <p className="text-[0.9375rem] leading-6 font-medium text-fg">{decision.title}</p>
              <p className="mt-0.5 text-[0.9375rem] leading-6 text-fg-muted">{decision.detail}</p>
            </li>
          ))}
        </ul>
      ),
    });
  }

  if (project.stack.length > 0) {
    rows.push({
      label: "Stack",
      content: (
        // Each chip opens that skill in the Technical DNA (without JavaScript: jumps to Skills).
        // `--k` orders the chips' entrance, 40 ms apart, after their row.
        <ul className="flex flex-wrap gap-1.5 @xl/body:pt-0.5">
          {project.stack.map((term, k) => (
            <li key={term} className="case-stack-item" style={{ "--k": k } as StyleVars}>
              {mappedSkills.has(term.toLowerCase()) ? (
                <a
                  {...skillLinkProps(term)}
                  className="case-chip inline-flex min-h-8 items-center rounded-md border border-line bg-tint/[0.03] px-2.5 font-mono text-xs leading-none text-fg-muted pointer-coarse:min-h-11 pointer-coarse:px-3"
                >
                  {term}
                  <span className="sr-only"> (see in Skills)</span>
                </a>
              ) : (
                <Tag className="min-h-8 px-2.5 text-xs">{term}</Tag>
              )}
            </li>
          ))}
        </ul>
      ),
    });
  }

  return (
    <article
      data-spotlight
      aria-labelledby={titleId}
      className="case-study card spotlight grid grid-cols-1 gap-y-6 rounded-3xl p-5 sm:p-7 lg:grid-cols-2 lg:grid-rows-[auto_1fr_auto] lg:gap-x-10 lg:p-8 xl:gap-x-12 xl:p-10"
    >
      {/* Sheen: a light band sweeps across the card once after it reveals (CSS only; the span
          clips the band to the card's rounded corners). Decorative, hidden in print. */}
      <span aria-hidden="true" className="case-sheen print:hidden" />

      {/* Header */}
      <header className={cn("lg:row-start-1", copyCol)}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="eyebrow flex items-center gap-3">
            <span className="case-index inline-block text-accent">{project.index}</span>
            <span aria-hidden="true" className="case-rule h-px w-6 shrink-0 bg-line-strong" />
            <span>{project.category}</span>
          </p>
          {project.status ? (
            <p>
              <StatusPill>
                <span className="sr-only">Status: </span>
                {project.status}
              </StatusPill>
            </p>
          ) : null}
        </div>

        <h3
          id={titleId}
          className="case-title mt-4 font-display text-[clamp(1.75rem,3vw,2.375rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-fg"
        >
          {project.title}
        </h3>
        {project.context ? (
          <p className="mt-2.5 font-mono text-xs leading-relaxed text-fg-subtle">{project.context}</p>
        ) : null}
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

      {/* Details: their own reveal, so on a phone (where they sit far below the card's top) the
          rows stagger in as they come into view; `.stagger` and data-reveal-item come from
          app/globals.css. */}
      <Reveal y={0} stagger className={cn("@container/body lg:row-start-2", copyCol)}>
        <dl>
          {rows.map((row, i) => (
            <CaseRow key={row.label} index={i} label={row.label}>
              {row.content}
            </CaseRow>
          ))}
        </dl>
      </Reveal>

      {/* Actions. "Ask me about" is an in-page link (ArrowRight); the contact form reads `data-ask`
          to set the topic. Nothing here is useful on paper except real project links. */}
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-6 gap-y-1 border-t border-line pt-3 lg:row-start-3",
          project.links.length === 0 && "print:hidden",
          copyCol,
        )}
      >
        {project.links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-medium text-fg underline decoration-line-strong underline-offset-[5px] transition-colors duration-200 hover:decoration-accent focus-visible:decoration-accent active:decoration-accent"
          >
            {link.label}
            <span className="sr-only"> for {project.title} (opens in a new tab)</span>
            <ArrowUpRight
              aria-hidden="true"
              className="size-4 text-fg-muted transition-transform duration-300 ease-out-expo group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 group-focus-visible/link:translate-x-0.5 group-focus-visible/link:-translate-y-0.5 group-active/link:translate-x-0.5 group-active/link:-translate-y-0.5"
            />
          </a>
        ))}

        <a
          href="#contact-form-title"
          data-ask={project.title}
          className="group/ask inline-flex min-h-11 items-center gap-3 text-[0.9375rem] font-medium text-fg print:hidden"
        >
          <span className="underline decoration-line-strong underline-offset-[5px] transition-colors duration-200 group-hover/ask:decoration-accent group-focus-visible/ask:decoration-accent group-active/ask:decoration-accent">
            Ask me about {project.title}
          </span>
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-full border border-line-strong text-fg-muted transition-[translate,border-color,color] duration-200 ease-out-quart group-hover/ask:translate-x-0.5 group-hover/ask:border-accent/60 group-hover/ask:text-accent group-focus-visible/ask:translate-x-0.5 group-focus-visible/ask:border-accent/60 group-focus-visible/ask:text-accent group-active/ask:translate-x-0.5 group-active/ask:border-accent/60 group-active/ask:text-accent"
          >
            <ArrowRight className="size-4" />
          </span>
        </a>
      </div>
    </article>
  );
}
