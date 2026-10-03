/**
 * Fixed, decorative page background: hairline grid, two soft glows that drift with the
 * scroll position (no autonomous looping), and film grain. Gradients are already soft,
 * so no blur filters are needed.
 */
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="backdrop-grid absolute inset-0" />
      <div className="glow-a absolute -top-[22rem] right-[-12rem] h-[48rem] w-[48rem] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-glow)_10%,transparent),transparent)]" />
      <div className="glow-b absolute top-[40%] -left-[18rem] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(closest-side,rgb(120_140_180/0.07),transparent)]" />
      <div className="backdrop-grain absolute inset-0" />
    </div>
  );
}
