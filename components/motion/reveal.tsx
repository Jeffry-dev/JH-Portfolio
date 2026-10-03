import type { CSSProperties, ReactNode } from "react";

type RevealTag = "div" | "li" | "article" | "section" | "header";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds to wait before animating. Use small values for staggered siblings. */
  delay?: number;
  /** Vertical offset in px at the start of the animation. */
  y?: number;
  as?: RevealTag;
  id?: string;
}

/**
 * Fades + lifts its children into view the first time they scroll into the viewport.
 * Server component: it only adds `data-reveal`; <RevealObserver /> and CSS do the rest,
 * so content stays visible without JavaScript and nothing extra ships to the client.
 */
export function Reveal({ children, className, delay = 0, y, as: Tag = "div", id }: RevealProps) {
  const style = {
    ...(delay ? { "--reveal-delay": `${Math.round(delay * 1000)}ms` } : {}),
    ...(y !== undefined ? { "--reveal-y": `${y}px` } : {}),
  } as CSSProperties;

  return (
    <Tag id={id} data-reveal="" className={className} style={style}>
      {children}
    </Tag>
  );
}
