/** Reserved catalog plate. The number is the category's place in the data, not an icon. */
export function ReservedPlate({ number }: { number: number }) {
  const label = String(Math.max(0, number)).padStart(2, "0");
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-stage" aria-hidden="true">
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,252,248,0.95),rgba(246,245,242,0)_70%)]" />
      <span className="relative font-light leading-none tracking-[-0.045em] text-plate text-[clamp(2.75rem,6.5vw,4.25rem)]">
        {label}
      </span>
    </span>
  );
}
