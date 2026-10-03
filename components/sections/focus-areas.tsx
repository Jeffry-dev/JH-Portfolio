import { focusAreas } from "@/data/focus-areas";
import { Icon } from "@/components/ui/icon";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/utils";

export function FocusAreas() {
  return (
    <section id="what-i-do" aria-labelledby="what-i-do-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading
          section="what-i-do"
          title="Two sides of my work: running systems and building software."
          titleId="what-i-do-title"
          description="The areas I work across, from the infrastructure people rely on every day to the applications that run on top of it."
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
              <article
                data-spotlight
                className="card spotlight group flex h-full flex-col rounded-2xl p-5 transition-[border-color,transform] duration-500 ease-out-expo hover:-translate-y-1 hover:border-line-strong sm:p-7"
              >
                {/* Phones: icon and title side by side. Larger screens: icon row, then the title. */}
                <div className="flex items-center gap-4 sm:flex-col sm:items-stretch sm:gap-8">
                  <div className="flex items-start justify-between">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-line bg-tint/[0.03] text-accent transition-colors duration-300 group-hover:border-accent/40 sm:size-11">
                      <Icon name={area.icon} className="size-5" />
                    </span>
                    <span aria-hidden="true" className="hidden font-mono text-xs text-fg-subtle sm:inline">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold tracking-[-0.015em] text-fg sm:text-[1.375rem]">{area.title}</h3>
                </div>
                <p
                  className={cn(
                    "mt-3 text-[0.9375rem] leading-relaxed text-fg-muted sm:mt-2.5",
                    area.size === "wide" && "xl:max-w-md",
                  )}
                >
                  {area.description}
                </p>

                <ul
                  aria-label={`${area.title}: related skills`}
                  className="mt-auto flex flex-wrap gap-x-3 gap-y-1.5 pt-4 sm:pt-7"
                >
                  {area.tags.map((tag) => (
                    <li key={tag} className="font-mono text-xs text-fg-subtle">
                      <span aria-hidden="true" className="mr-1.5 text-accent/70 light:text-accent">
                        /
                      </span>
                      {tag}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
