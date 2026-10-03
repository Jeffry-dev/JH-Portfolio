import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TagProps {
  children: ReactNode;
  className?: string;
}

/** Small mono label for technologies. */
export function Tag({ children, className }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-tint/[0.03] px-2 py-1 font-mono text-[0.75rem] leading-none text-fg-muted",
        className,
      )}
    >
      {children}
    </span>
  );
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
