import type { CSSProperties } from "react";
import { skillGroups } from "@/data/skills";
import { MarqueeToggle } from "@/components/motion/marquee-toggle";

const itemClass =
  "flex items-center font-display text-[clamp(1.75rem,4.5vw,3.5rem)] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap";

/**
 * Two rows of technologies scrolling continuously in opposite directions.
 * Each row holds its list twice and moves by exactly one copy, so the loop is seamless.
 * Keeps moving until the visitor presses Pause (WCAG 2.2.2); it also rests while off-screen.
 * Under reduced motion it becomes a static, wrapped list. The band itself is decorative:
 * the same skills are listed accessibly in the Skills section.
 */
export function TechMarquee() {
  /** Items from the given skill groups, in the order the ids are listed. */
  const itemsFrom = (ids: string[]) => [
    ...new Set(ids.flatMap((id) => skillGroups.find((group) => group.id === id)?.items ?? [])),
  ];
  // Top row (solid): development. Bottom row (outlined): IT & systems, databases and tools.
  const rows = [
    { items: itemsFrom(["frontend", "backend", "languages"]), direction: "left", outlined: false, duration: "70s" },
    { items: itemsFrom(["systems", "databases", "tools"]), direction: "right", outlined: true, duration: "80s" },
  ] as const;

  return (
    <div data-marquee="" className="marquee relative border-y border-line">
      <div
        aria-hidden="true"
        className="overflow-hidden pt-8 pb-2 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)] sm:pt-10"
      >
        {rows.map((row) => (
          <div key={row.direction} className="py-1.5">
            <div
              className="marquee-track"
              data-direction={row.direction}
              style={{ "--marquee-duration": row.duration } as CSSProperties}
            >
              {[0, 1].map((copy) => (
                <div key={copy} className={copy === 0 ? "marquee-copy" : "marquee-copy marquee-copy-clone"}>
                  {row.items.map((item) => (
                    <span
                      key={item}
                      className={
                        row.outlined
                          ? `${itemClass} marquee-outline`
                          : `${itemClass} text-fg/85`
                      }
                    >
                      {item}
                      <span className="mx-[0.6em] text-[0.5em] text-accent/80 light:text-accent">✦</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="container-page flex justify-end pb-4">
        <MarqueeToggle />
      </div>
    </div>
  );
}
