import { profile } from "@/data/profile";
import { getSection } from "@/data/navigation";
import { Reveal } from "@/components/motion/reveal";
import { SectionEyebrow } from "@/components/ui/section-heading";
import { SplitWords } from "@/components/ui/split-words";

export function About() {
  const { index, label } = getSection("about");

  return (
    <section id="about" aria-labelledby="about-title" className="section-y">
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal y={12} className="lg:sticky lg:top-28">
            <SectionEyebrow index={index} label={label} />
            <h2
              id="about-title"
              className="mt-5 text-[clamp(2.25rem,4.6vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.035em] text-fg"
            >
              <SplitWords text={profile.about.statement} />
            </h2>
          </Reveal>
        </div>

        <div className="lg:col-span-7 lg:pt-12">
          <div className="space-y-6 text-[1.0625rem] leading-[1.75] text-fg-muted sm:text-lg sm:leading-[1.75]">
            {profile.about.paragraphs.map((paragraph, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <p className={i === 0 ? "text-fg" : undefined}>{paragraph}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
