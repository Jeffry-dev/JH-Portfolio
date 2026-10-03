import { profile } from "@/data/profile";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  className?: string;
}

/**
 * The hero's "system status" bar: a full-width strip under the hero, aligned to the page grid.
 * Every value comes from data/profile.ts, so it only ever states facts (no uptime, no years,
 * no availability claims). No role row: the title sits right under the name in the hero.
 *
 * Layout: phones get a compact label/value list, tablets a 2 x 2 grid, desktops one row
 * (status label on the left, then four cells separated by hairlines).
 */
export function StatusCard({ className }: StatusCardProps) {
  const { statusCard, location } = profile;

  const rows = [
    { label: "Status", value: statusCard.status },
    { label: "Focus", value: statusCard.focus.join(" · ") },
    { label: "Stack", value: statusCard.stack.join(" · ") },
    { label: "Based in", value: `${location.city}, ${location.country}` },
  ];

  // Hairlines between cells for each layout (phone list, tablet 2 x 2, desktop row).
  const cellBorders = [
    "sm:border-t-0",
    "border-t sm:border-t-0 sm:border-l lg:border-l",
    "border-t sm:border-l-0 lg:border-t-0 lg:border-l",
    "border-t sm:border-l lg:border-t-0",
  ];

  return (
    <div
      role="group"
      aria-labelledby="system-status-label"
      className={cn("card flex flex-col overflow-hidden rounded-2xl lg:flex-row lg:items-stretch", className)}
    >
      <p
        id="system-status-label"
        className="eyebrow flex shrink-0 items-center gap-2.5 border-b border-line px-5 py-3.5 sm:px-6 lg:border-r lg:border-b-0 lg:py-5 lg:pr-7"
      >
        <span aria-hidden="true" className="ping size-2 shrink-0 rounded-full bg-ok" />
        System status
      </p>

      <dl className="grid flex-1 sm:grid-cols-2 lg:grid-cols-[1.45fr_1fr_1.2fr_0.75fr]">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={cn(
              "grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-x-3 border-line px-5 py-3 sm:block sm:px-6 sm:py-4 lg:px-5 lg:py-5",
              cellBorders[index],
            )}
          >
            <dt className="font-mono text-[0.6875rem] leading-4 tracking-[0.08em] text-fg-subtle uppercase">
              {row.label}
            </dt>
            <dd className="text-sm leading-snug text-fg sm:mt-1.5 sm:text-[0.9375rem] lg:text-sm">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
