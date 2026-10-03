import { cn } from "@/lib/utils";
import { getSection } from "@/data/navigation";
import { Reveal } from "@/components/motion/reveal";
import { SplitWords } from "@/components/ui/split-words";

interface SectionHeadingProps {
  /** Section id from data/navigation.ts. Provides the eyebrow number and label. */
  section: string;
  title: string;
  /** id applied to the <h2> so the section can reference it with aria-labelledby. */
  titleId: string;
  description?: string;
  className?: string;
}

/** Eyebrow index + label, a word-by-word rising h2, and an optional lede. */
export function SectionHeading({ section, title, titleId, description, className }: SectionHeadingProps) {
  const { index, label } = getSection(section);

  return (
    <Reveal as="header" y={12} className={cn("mb-12 max-w-3xl lg:mb-16", className)}>
      <SectionEyebrow index={index} label={label} />
      <h2
        id={titleId}
        className="mt-5 text-[clamp(2rem,4.2vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-fg"
      >
        <SplitWords text={title} />
      </h2>
      {description ? (
        <p className="mt-5 max-w-2xl text-base text-fg-muted sm:text-lg">{description}</p>
      ) : null}
    </Reveal>
  );
}

export function SectionEyebrow({ index, label }: { index: string; label: string }) {
  return (
    <p className="eyebrow flex items-center gap-3">
      <span className="text-accent">{index}</span>
      <span aria-hidden="true" className="h-px w-8 bg-line-strong" />
      <span>{label}</span>
    </p>
  );
}
