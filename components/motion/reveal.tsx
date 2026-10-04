import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealTag = "div" | "li" | "article" | "section" | "header";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before animating. Use small values for staggered siblings. */
  delay?: number;
  /** Vertical offset in px at the start of the animation. */
  y?: number;
  /**
   * Adds the `stagger` class (app/globals.css): descendants marked `data-reveal-item` with
   * `style={{ "--i": index }}` fade and rise in sequence (60 ms apart) once this reveal plays.
   */
  stagger?: boolean;
  as?: RevealTag;
  id?: string;
}

/**
 * Fades + lifts its children into view as they scroll into the viewport. <RevealObserver />
 * decides whether the entrance plays or the content appears instantly, and when it re-arms.
 * Server component: it only adds `data-reveal` (and `stagger`); <RevealObserver /> and CSS do
 * the rest, so content stays visible without JavaScript and nothing extra ships to the client.
 */
export function Reveal({ children, className, delay = 0, y, stagger = false, as: Tag = "div", id }: RevealProps) {
  const style = {
    ...(delay ? { "--reveal-delay": `${Math.round(delay * 1000)}ms` } : {}),
    ...(y !== undefined ? { "--reveal-y": `${y}px` } : {}),
  } as CSSProperties;

  return (
    <Tag id={id} data-reveal="" className={cn(className, stagger && "stagger") || undefined} style={style}>
      {children}
    </Tag>
  );
}
