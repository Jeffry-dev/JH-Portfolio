import type { CSSProperties } from "react";
import { focusAreas } from "@/data/focus-areas";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

/** Inline custom properties (the stagger order `--i`). */
type StyleVars = CSSProperties & Record<`--${string}`, number | string>;

/**
 * Each card is its own reveal, so on a phone (one column) every card animates as it scrolls
 * into view instead of the whole grid playing at once above the fold; in a row the delay
 * staggers the cards 60 ms apart. Inside a card the icon tile pops in (scale 0.8 to 1), then
 * the title and the description follow (`.stagger`, `data-reveal-item` in app/globals.css).
 * The cards carry `data-spotlight`: the border light follows a mouse, a tap ripples from the finger.
 */
export function FocusAreas() {
  return (
    <section id="what-i-do" aria-labelledby="what-i-do-label what-i-do-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading
          section="what-i-do"
          title="From APIs, web apps and databases to Windows Server and networks."
          titleId="what-i-do-title"
          description="The areas I work across, on both the development side and the systems side."
        />

        {/* Bento: 2 columns on tablets, 4 on wide screens where "wide" cards span two. */}
        <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {focusAreas.map((area, index) => (
            <Reveal
              as="li"
              key={area.id}
              delay={(index % 4) * 0.06}
              className={cn(area.size === "wide" && "xl:col-span-2")}
            >
              {/* Not interactive, so no lift: only the border and the spotlight respond to the pointer. */}
              <article
                data-spotlight
                className="card spotlight stagger group flex h-full flex-col rounded-2xl p-5 transition-colors duration-200 hover:border-line-strong sm:p-7"
              >
                {/* Phones: icon and title side by side. Larger screens: icon, then the title. */}
                <div className="flex items-center gap-4 sm:flex-col sm:items-stretch sm:gap-8">
                  {/* The pop lives on a wrapper, so the tile keeps its own border transition on hover. */}
                  <span data-reveal-item="pop" style={{ "--i": 0 } as StyleVars} className="flex shrink-0">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-tint/[0.03] text-accent transition-colors duration-200 group-hover:border-accent/40 sm:size-11">
                      <Icon name={area.icon} className="size-5" />
                    </span>
                  </span>
                  <h3
                    data-reveal-item=""
                    style={{ "--i": 1 } as StyleVars}
                    className="text-xl leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-[1.375rem]"
                  >
                    {area.title}
                  </h3>
                </div>
                <p
                  data-reveal-item=""
                  style={{ "--i": 2 } as StyleVars}
                  className={cn(
                    "mt-3 text-[0.9375rem] leading-relaxed text-fg-muted sm:mt-2.5",
                    area.size === "wide" && "xl:max-w-md",
                  )}
                >
                  {area.description}
                </p>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
