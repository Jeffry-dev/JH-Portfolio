import { ArrowUp } from "lucide-react";
import { profile } from "@/data/profile";
import { sections } from "@/data/navigation";

export function Footer() {
  const year = new Date().getFullYear();
  const links = sections.filter((section) => section.desktopNav || section.id === "contact");

  return (
    <footer className="border-t border-line">
      <div className="container-page flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
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

        <nav aria-label="Footer">
          <ul className="-mx-2 flex flex-wrap text-sm text-fg-muted">
            {links.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="group inline-flex min-h-11 items-center rounded-md px-2 transition-colors hover:text-fg"
                >
                  <span className="link-underline">{section.label}</span>
                </a>
              </li>
            ))}
            <li>
              <a
                href="#top"
                className="group inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 transition-colors hover:text-fg"
              >
                <span className="link-underline">Back to top</span>
                <ArrowUp aria-hidden="true" className="size-3.5 transition-transform group-hover:-translate-y-0.5" />
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
