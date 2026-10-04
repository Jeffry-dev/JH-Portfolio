import { profile } from "@/data/profile";
import { techDna } from "@/data/tech-dna";
import { SectionHeading } from "@/components/ui/section-heading";
import { TechDna, type TechDnaClientGraph } from "@/components/skills/tech-dna";

/** Only what the explorer reads. `edges` repeats each node's `connections`, so it stays on the server. */
const dnaGraph: TechDnaClientGraph = {
  domains: techDna.domains,
  nodes: techDna.nodes,
  sources: techDna.sources,
  aliases: techDna.aliases,
};

/**
 * Skills as a "Technical DNA" graph: every skill from data/skills.ts, grouped into four
 * domains and linked where a project stack or a role (the XpertBot internship, the SmartSource
 * role) used them together. It follows Projects, so it maps work the reader has just seen.
 * The graph is derived in data/tech-dna.ts; the client component only adds interaction.
 */
export function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-label skills-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading
          section="skills"
          title="Technical DNA."
          titleId="skills-title"
          description="Every skill on one map, linked wherever a project or role used it."
        />

        <TechDna graph={dnaGraph} hub={{ name: profile.name, title: profile.title }} />
      </div>
    </section>
  );
}
