import { displayText, formatPrice, type PresentedPick } from "@/lib/present";
import { EmptyPlate } from "./empty-plate";
import { ProductImage } from "./product-image";

/** Slot width: 6 / 4 / 3 / 2 columns inside the tier frame. */
const CARD_SIZES =
  "(min-width: 1280px) calc((min(100vw, 1440px) - 104px) / 6), (min-width: 1024px) calc((min(100vw, 1440px) - 88px) / 4), (min-width: 768px) calc((100vw - 64px) / 3), calc((100vw - 40px) / 2)";

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
  const price = pick ? formatPrice(pick.main.price, pick.main.currency) : null;
  const meta = pick ? [brand, name].filter(Boolean).join(" · ") : `${section} · ${name}`;
  const title = pick ? (productName ?? name) : "Pick coming";

  return (
    <button
      type="button"
      id={`card-${id}`}
      data-pick={id}
      aria-haspopup="dialog"
      className="group flex h-full w-full min-w-0 cursor-pointer flex-col text-left focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
    >
      <span className="relative block aspect-square w-full overflow-hidden rounded-2xl bg-field transition-colors duration-[380ms] ease-catalog group-hover:bg-[#efefef]">
        {pick ? (
          <ProductImage
            src={pick.main.image}
            srcSet={pick.main.srcSet}
            priority={priority}
            sizes={CARD_SIZES}
            className="absolute inset-0 h-full w-full object-contain p-6 sm:p-8"
          />
        ) : (
          <EmptyPlate />
        )}
        <span
          aria-hidden="true"
          className="absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-paper text-ink transition-colors duration-[380ms] ease-catalog group-hover:bg-ink group-hover:text-paper"
        >
          <ArrowUpRight />
        </span>
      </span>
      <span className="flex flex-col gap-1 px-0.5 pt-3 pb-1">
        {pick ? (
          <>
            <span className="text-[12px] leading-4 tracking-[0.01em] text-muted">{meta}</span>
            <span className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-[13px] leading-5 text-ink">{title}</span>
              {price ? <span className="shrink-0 font-mono text-[13px] leading-5 text-ink">{price}</span> : null}
            </span>
          </>
        ) : (
          <>
            <span className="text-[13px] leading-5 text-ink">{name}</span>
            <span className="text-[12px] leading-4 tracking-[0.01em] text-muted">
              <span className="sr-only">{section}, </span>Pick coming
            </span>
          </>
        )}
      </span>
    </button>
  );
}
