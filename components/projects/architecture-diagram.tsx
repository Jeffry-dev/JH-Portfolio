import type { CSSProperties } from "react";
import type { Project } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

type StyleVars = CSSProperties & Record<`--${string}`, number | string>;

interface ArchitectureDiagramProps {
  project: Pick<Project, "index" | "title" | "architecture" | "modules">;
  className?: string;
}

/** "NestJS · .NET" is read as "NestJS, .NET" in the screen reader caption. */
function spoken(detail: string): string {
  return detail.split(" · ").join(", ");
}

/**
 * Vertical schematic of a project, drawn exactly from `project.architecture` (top to bottom)
 * with optional `modules` attached to the middle node. Server component: no client JS.
 *
 * - Entrance: once the surrounding card is revealed, nodes and connectors appear in order
 *   (slot `--s`: node 0, connector 1, node 1, ...), then the modules (slot `--m`).
 * - Active card (hover or keyboard focus): a pulse runs down the connectors and the nodes
 *   light up in turn (index `--i`), twice, then the diagram rests on its static accents.
 *   See styles/architecture.css.
 * - Layout follows the panel's own width (`@container/arch`): compact panels keep modules in
 *   a tray under their node; wider ones branch them off to the side. Wide panels share one
 *   spine width and center the whole drawing, so every figure lines up the same way.
 *
 * The drawing is decorative; the sr-only figcaption carries the same information as text.
 */
export function ArchitectureDiagram({ project, className }: ArchitectureDiagramProps) {
  const nodes = project.architecture;
  if (nodes.length === 0) return null;

  const modules = project.modules ?? [];
  const hasModules = modules.length > 0;
  const middle = Math.floor((nodes.length - 1) / 2);
  const modulesSlot = nodes.length * 2 - 1;

  const flow = nodes.map((node) => `${node.label} (${spoken(node.detail)})`).join(" to ");
  const caption =
    `${project.title} architecture, from top to bottom: ${flow}.` +
    (hasModules ? ` Modules: ${modules.join(", ")}.` : "");

  return (
    <figure
      className={cn(
        "arch relative flex flex-col overflow-hidden rounded-2xl border border-line bg-bg-raised",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 font-mono text-[0.6875rem] text-fg-subtle sm:px-5"
      >
        <span className="tracking-[0.08em] uppercase">Architecture</span>
        <span>fig.{project.index}</span>
      </div>

      <div className="arch-canvas @container/arch relative flex flex-1 items-center px-3.5 py-8 sm:px-6 sm:py-10">
        <ol aria-hidden="true" data-modules={hasModules ? "" : undefined} className="arch-flow mx-auto w-full">
          {nodes.map((node, i) => {
            const withModules = hasModules && i === middle;
            return (
              <li key={`${node.label}-${i}`} className="arch-step" style={{ "--i": i } as StyleVars}>
                {i > 0 ? (
                  <span className="arch-link" style={{ "--s": i * 2 - 1 } as StyleVars}>
                    <span className="arch-line" />
                    <span className="arch-pulse" />
                    <svg className="arch-head" viewBox="0 0 9 6" width="9" height="6" focusable="false">
                      <path d="M0 0h9L4.5 6z" fill="currentColor" />
                    </svg>
                  </span>
                ) : null}

                <div className="arch-row">
                  <div
                    className="arch-node flex items-center gap-3 rounded-xl border border-line-strong bg-surface px-3 py-2.5 @md/arch:gap-3.5 @md/arch:px-4 @md/arch:py-3"
                    data-has-mods={withModules ? "" : undefined}
                    style={{ "--s": i * 2 } as StyleVars}
                  >
                    <span className="arch-icon grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-tint/[0.04] text-accent @md/arch:size-9">
                      <Icon name={node.icon} className="size-4 @md/arch:size-[1.125rem]" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="font-mono text-[0.6875rem] leading-4 tracking-[0.08em] text-fg-subtle uppercase">
                        {node.label}
                      </span>
                      <span className="font-display text-[0.9375rem] leading-snug font-medium tracking-[-0.01em] break-words text-fg @md/arch:text-[1.0625rem]">
                        {node.detail}
                      </span>
                    </span>
                  </div>

                  {withModules ? (
                    <>
                      <span className="arch-branch" style={{ "--s": modulesSlot } as StyleVars}>
                        <span className="arch-branch-pulse" />
                      </span>
                      <div className="arch-mods" style={{ "--s": i * 2, "--m": modulesSlot } as StyleVars}>
                        <span className="block font-mono text-[0.6875rem] leading-4 tracking-[0.08em] text-fg-subtle uppercase">
                          Modules
                        </span>
                        <ul className="arch-chips">
                          {modules.map((module, k) => (
                            <li
                              key={module}
                              className="arch-chip rounded-md border border-dashed border-line-strong bg-surface px-2 py-1 font-mono text-[0.6875rem] leading-tight text-fg-muted"
                              style={{ "--k": k } as StyleVars}
                            >
                              {module}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
