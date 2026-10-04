/**
 * Fixed, decorative page background: hairline grid, two soft glows that drift with the
 * scroll position (no autonomous looping), and film grain. The drift is a CSS scroll
 * timeline (`.glow-a` / `.glow-b` in app/globals.css); browsers without one get the same
 * path from the --scroll-progress variable written by <ScrollFallback />. Gradients are
 * already soft, so no blur filters are needed. Glow colours are theme tokens (--glow-warm,
 * --glow-cool), so on the light theme they stay warm light instead of grey or tan smudges.
 * Not printed.
 */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden print:hidden">
      <div className="backdrop-grid absolute inset-0" />
      <div className="glow-a absolute -top-[22rem] right-[-12rem] h-[48rem] w-[48rem] rounded-full bg-[radial-gradient(closest-side,var(--glow-warm),transparent)]" />
      <div className="glow-b absolute top-[40%] -left-[18rem] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,var(--glow-cool),transparent)]" />
      <div className="backdrop-grain absolute inset-0" />
    </div>
  );
}
