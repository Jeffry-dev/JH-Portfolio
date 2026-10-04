import { profile } from "@/data/profile";
import { getSection } from "@/data/navigation";
import { Reveal } from "@/components/motion/reveal";
import { SectionEyebrow } from "@/components/ui/section-heading";
import { SplitWords } from "@/components/ui/split-words";

export function About() {
  const { index, label } = getSection("about");

  return (
    <section id="about" aria-labelledby="about-label about-title" className="section-y">
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <Reveal y={12} className="lg:sticky lg:top-28">
            <SectionEyebrow index={index} label={label} labelId="about-label" />
            {/* aria-label keeps the statement one phrase for screen readers (the words are split for the reveal). */}
            <h2
              id="about-title"
              aria-label={profile.about.statement}
              className="mt-5 text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-fg"
            >
              <SplitWords text={profile.about.statement} />
            </h2>
          </Reveal>
        </div>

        <div className="lg:col-span-7 lg:pt-12">
          {/* Long-form copy: capped at about 70 characters per line. Body text fades in without a rise. */}
          <div className="max-w-[36rem] space-y-6 text-[1.0625rem] leading-[1.75] text-fg-muted sm:text-lg sm:leading-[1.75]">
            {profile.about.paragraphs.map((paragraph, i) => (
              <Reveal key={i} delay={i * 0.05} y={0}>
                <p className={i === 0 ? "text-fg" : undefined}>{paragraph}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
