/** Quiet reserved square: light gray with a faint product-photo glyph (CSS background). No text. */
export function EmptyPlate({ label }: { label?: string }) {
  return (
    <span className="empty-plate" aria-hidden="true">
      {label ? (
        <span className="mt-16 max-w-[14ch] text-center text-[12px] leading-4 tracking-[0.01em] text-muted">{label}</span>
      ) : null}
    </span>
  );
}
