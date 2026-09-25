/** Quiet reserved plate. A hairline, not a numeral and not a broken-image icon. */
export function EmptyPlate({ label }: { label?: string }) {
  return (
    <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-field" aria-hidden="true">
      <span className="block h-px w-6 bg-ink" />
      {label ? (
        <span className="max-w-[14ch] text-center text-[12px] leading-4 tracking-[0.01em] text-muted">{label}</span>
      ) : null}
    </span>
  );
}
