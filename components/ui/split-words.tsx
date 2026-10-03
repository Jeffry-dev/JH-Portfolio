import { Fragment, type CSSProperties } from "react";

/**
 * Splits a heading into words that each rise out of their own mask when the
 * surrounding `[data-reveal]` element is revealed. Plain spans + real spaces,
 * so the text reads and copies normally.
 */
export function SplitWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span className="split-words">
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
