import { displayText, formatPrice, shortCardName, type PresentedPick } from "@/lib/present";
import { EmptyPlate } from "./empty-plate";
import { ProductImage } from "./product-image";

/** Slot width: 2 / 3 / 4 columns. Desktop stays at 4. */
const CARD_SIZES =
  "(min-width: 1024px) calc((min(100vw, 1440px) - 88px) / 4), (min-width: 768px) calc((100vw - 64px) / 3), calc((100vw - 40px) / 2)";

function ArrowUpRight() {
  return (
    <svg viewBox="0 0 14 14" className="h-3.5 w-3.5" aria-hidden="true" fill="none">
      <path d="M4.25 9.75 9.75 4.25M5.5 4.25h4.25V8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CategoryCard({
  id,
  name,
  section,
  pick,
  priority,
}: {
  id: string;
  name: string;
  section: string;
  pick: Pick<PresentedPick, "main"> | null;
  priority: "high" | "eager" | "lazy";
}) {
  const brand = pick ? displayText(pick.main.brand) : null;
  const productName = pick ? displayText(pick.main.name) : null;
  const shortName = productName ? shortCardName(productName) : null;
  const price = pick ? formatPrice(pick.main.price, pick.main.currency) : null;
  const subline = [brand, shortName].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      id={`card-${id}`}
      data-pick={id}
      aria-haspopup="dialog"
      className="group flex h-full w-full min-w-0 cursor-pointer flex-col rounded-2xl border border-line bg-card p-3 text-center focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
    >
      <span className="relative block aspect-square w-full overflow-hidden">
        {pick ? (
          <ProductImage
            src={pick.main.image}
            srcSet={pick.main.srcSet}
            priority={priority}
            sizes={CARD_SIZES}
            className="absolute inset-0 h-full w-full object-contain p-4 sm:p-5"
          />
        ) : (
          <EmptyPlate />
        )}
        <span
          aria-hidden="true"
          className="absolute top-1.5 right-1.5 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink transition-colors duration-[380ms] ease-catalog group-hover:bg-ink group-hover:text-paper"
        >
          <ArrowUpRight />
        </span>
      </span>
      <span className="flex flex-col items-center gap-1 px-1 pt-3 pb-1">
        <span className="text-[15px] leading-5 font-medium tracking-[-0.01em] text-ink">{name}</span>
        {pick ? (
          <>
            {subline ? <span className="text-[12px] leading-4 text-pretty text-muted">{subline}</span> : null}
            {price ? <span className="mt-0.5 font-mono text-[13px] leading-5 text-ink">{price}</span> : null}
          </>
        ) : (
          <span className="text-[12px] leading-4 text-muted">
            <span className="sr-only">{section}, </span>Pick coming
          </span>
        )}
      </span>
    </button>
  );
}
