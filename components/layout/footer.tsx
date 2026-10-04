import type { CSSProperties } from "react";
import { ArrowUp } from "lucide-react";
import { profile } from "@/data/profile";
import { sections } from "@/data/navigation";
import { Reveal } from "@/components/motion/reveal";

// Hover, keyboard focus and a tap all brighten the link; the underline grows on hover, focus and press.
const linkClass =
  "group inline-flex min-h-11 items-center rounded-md px-2 transition-colors hover:text-fg focus-visible:text-fg active:text-fg";

/** Position in the entrance stagger (app/globals.css `.stagger`). */
const order = (i: number) => ({ "--i": i }) as CSSProperties;

/**
 * Site footer. The lowest-motion part of the page: as it comes into view the brand block, then
 * each link, fade and rise in sequence (the stagger utility), and the Back to top arrow nudges
 * up on hover, focus and press.
 */
export function Footer() {
  const year = new Date().getFullYear();
  const links = sections.filter((section) => section.desktopNav || section.id === "contact");

  return (
    <footer className="border-t border-line">
      <Reveal
        y={0}
        className="container-page stagger flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between"
      >
        <div data-reveal-item style={order(0)} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-[10px] border border-line-strong bg-tint/[0.04] font-mono text-[0.8125rem] font-semibold text-fg"
          >
            JH
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-semibold text-fg">{profile.name}</p>
            <p className="text-xs text-fg-subtle">
              © {year} · {profile.title} · {profile.location.city}, {profile.location.country}
            </p>
          </div>
        </div>

        <nav aria-label="Footer" className="print:hidden">
          <ul className="-mx-2 flex flex-wrap text-sm text-fg-muted">
            {links.map((section, i) => (
              <li key={section.id} data-reveal-item style={order(i + 1)}>
                <a href={`#${section.id}`} className={linkClass}>
                  <span className="link-underline">{section.label}</span>
                </a>
              </li>
            ))}
            <li data-reveal-item style={order(links.length + 1)}>
              <a href="#top" className={`${linkClass} gap-1.5`}>
                <span className="link-underline">Back to top</span>
                <ArrowUp
                  aria-hidden="true"
                  className="size-3.5 transition-transform duration-300 ease-out-expo group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5 group-active:-translate-y-0.5"
                />
              </a>
            </li>
          </ul>
        </nav>
      </Reveal>
    </footer>
  );
}
