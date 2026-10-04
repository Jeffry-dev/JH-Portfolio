import { Fragment, type CSSProperties } from "react";

/**
 * Splits a heading into words that each rise out of their own mask when the
 * surrounding `[data-reveal]` element is revealed. Kept for the two bookend statements
 * (About, Contact); section headings use a plain h2.
 *
 * The split markup is aria-hidden, because WebKit exposes every inline-block word as its own
 * text run (VoiceOver would stop on each word). The parent heading must carry the full text
 * as its aria-label, as the hero h1 does. Real spaces keep copy and paste normal.
 */
export function SplitWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span aria-hidden="true" className="split-words">
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span className="w">
            <span style={{ "--i": i } as CSSProperties}>{word}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
