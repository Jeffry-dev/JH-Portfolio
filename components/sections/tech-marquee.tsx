import type { CSSProperties } from "react";
import { skillGroups } from "@/data/skills";
import { Reveal } from "@/components/motion/reveal";
import { MarqueeToggle } from "@/components/motion/marquee-toggle";

// Below the section h2 size at every width, so the decorative band never outranks a heading.
const itemClass =
  "flex items-center font-display text-[clamp(1.375rem,3.2vw,2.5rem)] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap";

/**
 * Two rows of technologies scrolling continuously in opposite directions.
 * Each row holds its list twice and moves by exactly one copy, so the loop is seamless.
 * Both rows move at the same, slow speed: <MarqueeToggle /> sets each row's duration from its
 * measured width; the durations below are the same speed at the largest type size, for the
 * moment before hydration and for visitors without JavaScript.
 * Entrance: the band is a Reveal; as it comes into view each row slides in from the side it
 * then travels away from (`.marquee-row` in app/globals.css, on a wrapper so the track's own
 * transform stays the marquee), and the entrance replays with the rest of the page.
 * Keeps moving until the visitor presses Pause (WCAG 2.2.2); it also rests while off-screen.
 * Under reduced motion it becomes a static, wrapped list. The band itself is decorative:
 * the same skills are listed accessibly in the Skills section. Not printed.
 */
export function TechMarquee() {
  /** Items from the given skill groups, in the order the ids are listed. */
  const itemsFrom = (ids: string[]) => [
    ...new Set(ids.flatMap((id) => skillGroups.find((group) => group.id === id)?.items ?? [])),
  ];
  // Top row (solid): development. Bottom row (outlined): IT & systems, databases and tools.
  const rows = [
    { items: itemsFrom(["frontend", "backend", "languages"]), direction: "left", outlined: false, duration: "97s" },
    { items: itemsFrom(["systems", "databases", "tools"]), direction: "right", outlined: true, duration: "173s" },
  ] as const;

  return (
    <div data-marquee="" className="marquee relative border-y border-line print:hidden">
      <Reveal y={0}>
        <div
          aria-hidden="true"
          className="overflow-hidden pt-6 pb-2 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)] sm:pt-8"
        >
          {rows.map((row) => (
            <div key={row.direction} className="marquee-row py-1.5" data-direction={row.direction}>
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
                            : `${itemClass} text-fg/70`
                        }
                      >
                        {item}
                        <span className="marquee-sep mx-[0.6em] text-[0.5em] text-accent/80 light:text-accent">✦</span>
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
      </Reveal>
    </div>
  );
}
