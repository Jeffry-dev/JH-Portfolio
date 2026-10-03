import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: Variant;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-strong)_50%,transparent),0_8px_30px_-8px_color-mix(in_srgb,var(--color-accent)_50%,transparent)] hover:bg-accent-strong",
  secondary:
    "border border-line-strong bg-tint/[0.03] text-fg backdrop-blur-sm hover:border-tint/25 hover:bg-tint/[0.06]",
  ghost: "text-fg-muted hover:text-fg",
};

/**
 * Anchor styled as a button. Use for navigation (in-page anchors, mailto, external links);
 * use a real <button> for actions.
 */
export function ButtonLink({ href, variant = "primary", className, children, ...rest }: ButtonLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] font-medium",
        "transition-[background-color,border-color,color,transform] duration-200 ease-out active:scale-[0.98]",
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </a>
  );
}
