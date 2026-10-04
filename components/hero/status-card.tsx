import type { CSSProperties, ReactNode } from "react";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { projectAnchor, skillLinkProps } from "@/lib/tech-links";
import { StatusPill } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  className?: string;
}

interface Row {
  label: string;
  value: ReactNode;
  /** Optional second value under the first (a second <dd> for the same term). */
  extra?: ReactNode;
}

/*
 * Entrance: the bar fades in as a whole from 540ms (the .rise wrapper in sections/hero.tsx);
 * inside it the label and each cell's text rise on their own (.rise-y, transform only), one
 * cell every 70ms, so the facts land left to right. The hairlines stay put: the rise is on
 * the terms and values, not on the bordered cells.
 */
const STATUS_DELAY_MS = 540;
const CELL_STAGGER_MS = 70;
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

/*
 * Underlined value links (projects, stack). Keyboard focus and taps get the same accent
 * underline as hover. On touch screens an invisible extension makes each one a 44px target
 * without changing the layout.
 */
const valueLink =
  "relative whitespace-nowrap underline decoration-line-strong underline-offset-4 transition-[text-decoration-color] duration-150 hover:decoration-accent focus-visible:decoration-accent active:decoration-accent pointer-coarse:after:absolute pointer-coarse:after:-inset-x-1.5 pointer-coarse:after:-inset-y-3 pointer-coarse:after:content-['']";

/** Links wrap as whole items, so no separator is ever left dangling at the end of a line. */
function LinkList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-wrap gap-x-3.5 gap-y-1 pointer-coarse:gap-y-6">{children}</ul>;
}

/**
 * The hero's "system status" bar: a full-width strip under the hero, aligned to the page grid.
 * Every value comes from /data, so it only ever states facts (no uptime, no years). The
 * availability pill appears only when profile.statusCard.availability is set, and it owns the
 * green "live" dot, so green always means "available"; the label dot stays neutral.
 * No role row: the title and employer sit right under the name in the hero.
 *
 * Layout: phones get a compact label/value list, tablets and small laptops a 2 x 2 grid,
 * and from 80rem one row (status label on the left, then four cells separated by hairlines).
 */
export function StatusCard({ className }: StatusCardProps) {
  const { statusCard, location } = profile;

  const rows: Row[] = [
    {
      label: "Status",
      value: statusCard.status,
      extra: statusCard.availability ? (
        <StatusPill live>{statusCard.availability}</StatusPill>
      ) : undefined,
    },
    {
      label: "Projects",
      value: (
        <LinkList>
          {projects.map((project) => (
            <li key={project.id}>
              <a href={`#${projectAnchor(project.id)}`} className={valueLink}>
                {project.shortTitle ?? project.title}
              </a>
            </li>
          ))}
        </LinkList>
      ),
    },
    {
      label: "Stack",
      value: (
        <LinkList>
          {statusCard.stack.map((term) => (
            <li key={term}>
              <a {...skillLinkProps(term)} className={valueLink}>
                {term}
              </a>
            </li>
          ))}
        </LinkList>
      ),
    },
    { label: "Based in", value: `${location.city}, ${location.country}` },
  ];

  // Hairlines between cells for each layout (phone list, 2 x 2 grid, desktop row).
  const cellBorders = [
    "sm:border-t-0",
    "border-t sm:border-t-0 sm:border-l xl:border-l",
    "border-t sm:border-l-0 xl:border-t-0 xl:border-l",
    "border-t sm:border-l xl:border-t-0",
  ];

  return (
    <div
      role="group"
      aria-labelledby="system-status-label"
      className={cn("card flex flex-col overflow-hidden rounded-2xl xl:flex-row xl:items-stretch", className)}
    >
      <p
        id="system-status-label"
        className="eyebrow rise-y flex shrink-0 items-center gap-2.5 border-b border-line px-5 py-3.5 sm:px-6 xl:border-r xl:border-b-0 xl:py-5 xl:pr-7"
        style={delay(STATUS_DELAY_MS)}
      >
        <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-fg-subtle/70" />
        System status
      </p>

      {/* Auto-sized columns from 80rem: each value keeps to one line and spare room is shared out. */}
      <dl className="grid flex-1 sm:grid-cols-2 xl:grid-cols-[repeat(4,auto)]">
        {rows.map((row, index) => {
          const cellDelay = delay(STATUS_DELAY_MS + index * CELL_STAGGER_MS);
          return (
            <div
              key={row.label}
              className={cn(
                "grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-line px-5 py-3 sm:block sm:px-6 sm:py-4 xl:px-4",
                cellBorders[index],
              )}
            >
              <dt className="label-mono rise-y" style={cellDelay}>
                {row.label}
              </dt>
              <dd className="rise-y text-sm leading-snug text-fg sm:mt-1.5 sm:text-[0.9375rem] xl:text-sm" style={cellDelay}>
                {row.value}
              </dd>
              {row.extra ? (
                <dd className="rise-y col-start-2 mt-2" style={cellDelay}>
                  {row.extra}
                </dd>
              ) : null}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
