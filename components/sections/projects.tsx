import { projects } from "@/data/projects";
import { projectAnchor } from "@/lib/tech-links";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProjectCase } from "@/components/projects/project-case";

export function Projects() {
  return (
    <section id="projects" aria-labelledby="projects-label projects-title" className="section-y border-t border-line">
      <div className="container-page">
        <SectionHeading
          section="projects"
          title="Selected work."
          titleId="projects-title"
          description="Projects I’ve worked on, each as a short case study with its stack and architecture: a market dashboard, a company attendance and billing platform, and my university graduation project."
        />

        {/* html already sets scroll-padding-top for the fixed header; scroll-mt-4 only adds a small gap. */}
        <ol className="space-y-6 lg:space-y-8">
          {projects.map((project, index) => (
            <Reveal as="li" key={project.id} id={projectAnchor(project.id)} y={16} className="scroll-mt-4">
              <ProjectCase project={project} flipped={index % 2 === 1} />
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
