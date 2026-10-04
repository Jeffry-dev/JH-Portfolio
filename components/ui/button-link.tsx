import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  children: ReactNode;
}

const base =
  "group inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] font-medium transition-[background-color,border-color,color,scale] duration-150 ease-out-quart active:scale-[0.98]";

// Hover states have focus-visible twins, so keyboard users get the same feedback.
const variants: Record<ButtonVariant, string> = {
  primary: "accent-lift bg-accent text-accent-ink hover:bg-accent-strong focus-visible:bg-accent-strong",
  secondary:
    "border border-line-strong bg-tint/[0.03] text-fg hover:border-tint/25 hover:bg-tint/[0.06] focus-visible:border-tint/25 focus-visible:bg-tint/[0.06]",
  ghost: "text-fg-muted hover:text-fg focus-visible:text-fg",
};

/**
 * Class names of the site's button styles, for elements that can't be a ButtonLink
 * (a submit <button>, or a plain <a> on a page that avoids next/link).
 */
export function buttonClass(variant: ButtonVariant = "primary", className?: string): string {
  return cn(base, variants[variant], className);
}

/**
 * Anchor styled as a button. Use for navigation (in-page anchors, mailto, external links);
 * use a real <button> (styled with buttonClass) for actions.
 */
export function ButtonLink({ href, variant = "primary", className, children, ...rest }: ButtonLinkProps) {
  return (
    <a href={href} className={buttonClass(variant, className)} {...rest}>
      {children}
    </a>
  );
}
