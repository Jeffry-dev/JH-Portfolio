import type { Project } from "@/lib/types";
import { Icon } from "@/components/ui/icon";
import { ArchitectureExplorer } from "@/components/projects/architecture-explorer";
import { mentions, spoken } from "@/components/projects/architecture-text";
import { cn } from "@/lib/utils";

interface ArchitectureDiagramProps {
  project: Pick<Project, "id" | "index" | "title" | "architecture" | "modules" | "stack">;
  className?: string;
}

/**
 * Vertical schematic of a project, drawn exactly from `project.architecture` (top to bottom)
 * with optional `modules` attached to the middle node, plus an inspector that explains each
 * part. This server component renders the figure shell and the sr-only caption; the header
 * (whose "Architecture" label replays the data flow), the drawing and the inspector are a small
 * client island (architecture-explorer.tsx).
 *
 * - Entrance: once the surrounding card is revealed, nodes and connectors appear in order
 *   (slot `--s`: node 0, connector 1, node 1, ...), then the modules (slot `--m`).
 * - Inspecting: hover, keyboard focus, click or tap on a part shows its description in the
 *   inspector and lights the connectors next to it, with one data-flow pulse.
 * - Layout follows the panel's own width (`@container/arch`): compact panels keep modules in
 *   a tray under their node; wider ones branch them off to the side. Wide panels share one
 *   spine width and center the whole drawing, so every figure lines up the same way.
 *
 * The sr-only figcaption carries the whole flow as text. See styles/architecture.css.
 */
export function ArchitectureDiagram({ project, className }: ArchitectureDiagramProps) {
  const nodes = project.architecture;
  if (nodes.length === 0) return null;

  const modules = project.modules ?? [];
  const flow = nodes.map((node) => `${node.label} (${spoken(node.detail)})`).join(" to ");
  const caption =
    `${project.title} architecture, from top to bottom: ${flow}.` +
    (modules.length > 0 ? ` Modules: ${modules.join(", ")}.` : "");

  // For each stack technology, the nodes that name it in their technology line or description
  // (e.g. "TypeScript" lights Market Desk's Frontend and API). Stack chips use it for previews.
  const stackMatches = Object.fromEntries(
    project.stack.map((term) => [
      term,
      nodes.flatMap((node, i) => (mentions(node.detail, term) || mentions(node.description ?? "", term) ? [i] : [])),
    ]),
  );

  return (
    <figure
      className={cn(
        "arch relative flex flex-col overflow-hidden rounded-2xl border border-line bg-bg-raised",
        className,
      )}
    >
      <ArchitectureExplorer
        projectId={project.id}
        figureIndex={project.index}
        nodes={nodes.map(({ label, detail, description }) => ({ label, detail, description }))}
        icons={nodes.map((node, i) => (
          <Icon key={i} name={node.icon} className="size-4 @md/arch:size-[1.125rem]" />
        ))}
        modules={modules}
        stackMatches={stackMatches}
      />

      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}
