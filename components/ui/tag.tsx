import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TagProps {
  children: ReactNode;
  className?: string;
}

/** Look of a technology tag, for elements that can't be a <Tag> (a link to the skill, for example). */
export const tagClass =
  "inline-flex items-center rounded-md border border-line bg-tint/[0.03] px-2 py-1 font-mono text-[0.75rem] leading-none text-fg-muted";

/** Small mono label for technologies. */
export function Tag({ children, className }: TagProps) {
  return <span className={cn(tagClass, className)}>{children}</span>;
}

/** Renders a list of tags as a semantic list. */
export function TagList({ items, label, className }: { items: string[]; label: string; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
      {items.map((item) => (
        <li key={item}>
          <Tag>{item}</Tag>
        </li>
      ))}
    </ul>
  );
}

/**
 * Green status label with a dot ("Current role", "Completed"). One style for every status,
 * so the pills in Experience and the project cases match.
 */
export function StatusPill({
  children,
  live = false,
  className,
}: {
  children: ReactNode;
  /** Pinging dot, reserved for availability so green "live" always means available. */
  live?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-ok/25 bg-ok/[0.08] px-2.5 py-1 font-mono text-xs leading-none text-ok",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full bg-ok", live && "ping")} />
      {children}
    </span>
  );
}
