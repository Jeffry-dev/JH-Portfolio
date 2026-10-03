import { profile } from "@/data/profile";
import { techDna } from "@/data/tech-dna";
import { SectionHeading } from "@/components/ui/section-heading";
import { TechDna } from "@/components/skills/tech-dna";

/**
 * Skills as a "Technical DNA" graph: every skill from data/skills.ts, grouped into four
 * domains and linked where a project stack or a role (the XpertBot internship, the SmartSource
 * IT Specialist role) used them together.
 * The graph is derived in data/tech-dna.ts; the client component only adds interaction.
 */
export function Skills() {
  return (
    <section id="skills" aria-labelledby="skills-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading
          section="skills"
          title="Technical DNA."
          titleId="skills-title"
          description="The technologies I work with, from IT infrastructure to application code, mapped as one system."
        />

        <TechDna graph={techDna} hub={{ name: profile.name, title: profile.title }} />
      </div>
    </section>
  );
}
