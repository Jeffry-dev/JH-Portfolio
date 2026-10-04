import { cn } from "@/lib/utils";
import { getSection } from "@/data/navigation";
import { Reveal } from "@/components/motion/reveal";

/** Display size of a section h2, shared so headings outside SectionHeading can match it. */
export const sectionTitleClass = "text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-fg";

interface SectionHeadingProps {
  /** Section id from data/navigation.ts. Provides the eyebrow number and label. */
  section: string;
  title: string;
  /** id applied to the <h2> so the section can reference it with aria-labelledby. */
  titleId: string;
  description?: string;
  className?: string;
}

/**
 * Eyebrow index + label, the h2 and an optional lede, revealed together as one block.
 * The eyebrow label gets the id "<section>-label", so the section can be named after both
 * (aria-labelledby="projects-label projects-title" reads "Projects, Selected work.").
 */
export function SectionHeading({ section, title, titleId, description, className }: SectionHeadingProps) {
  const { index, label } = getSection(section);

  return (
    <Reveal as="header" y={12} className={cn("mb-12 max-w-3xl lg:mb-16", className)}>
      <SectionEyebrow index={index} label={label} labelId={`${section}-label`} />
      <h2 id={titleId} className={cn("mt-5", sectionTitleClass)}>
        {title}
      </h2>
      {description ? (
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-fg-muted sm:text-lg">{description}</p>
      ) : null}
    </Reveal>
  );
}

interface SectionEyebrowProps {
  index: string;
  label: string;
  /** id for the label, so the section's aria-labelledby can include it ("<section>-label"). */
  labelId?: string;
}

/**
 * Section number, hairline and label. Inside a Reveal the three enter in order as the block
 * is revealed: the index fades in, the hairline draws toward the label, the label follows
 * (`.section-eyebrow` rules in app/globals.css). Outside a Reveal it is simply static.
 */
export function SectionEyebrow({ index, label, labelId }: SectionEyebrowProps) {
  return (
    <p className="section-eyebrow eyebrow flex items-center gap-3">
      <span className="eyebrow-index text-accent">{index}</span>
      <span aria-hidden="true" className="eyebrow-rule h-px w-8 bg-line-strong" />
      <span id={labelId} className="eyebrow-label">
        {label}
      </span>
    </p>
  );
}
