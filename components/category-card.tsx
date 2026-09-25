import { displayText, formatPrice, type PresentedPick } from "@/lib/present";
import { ProductImage } from "./product-image";
import { ReservedPlate } from "./reserved-plate";

/** Slot width: 5 columns inside a 1440px frame, or 2 columns below that. */
const CARD_SIZES =
  "(min-width: 1024px) calc((min(100vw, 1440px) - 112px) / 5), (min-width: 640px) calc((100vw - 60px) / 2), calc((100vw - 44px) / 2)";

export function CategoryCard({
  id,
  name,
  pick,
  number,
  priority,
}: {
  id: string;
  name: string;
  pick: PresentedPick | null;
  number: number;
  priority: "high" | "eager" | "lazy";
}) {
  const brand = pick ? displayText(pick.main.brand) : null;
  const productName = pick ? displayText(pick.main.name) : null;
  const why = pick ? displayText(pick.main.why) : null;
  const price = pick ? formatPrice(pick.main.price, pick.main.currency) : null;

  return (
    <button
      type="button"
      id={`card-${id}`}
      data-pick={id}
      aria-haspopup="dialog"
      className="group relative flex h-full w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-card text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-line group-hover:ring-ink"
      />
      <span className="block px-3 pt-1 lg:pt-2">
        <span className="block min-h-8 lg:min-h-4">
          <span className="block break-words text-[12px] font-medium leading-4 text-muted">{name}</span>
        </span>
      </span>
      <span className="relative mt-1 block aspect-[4/3] w-full bg-stage lg:mt-0">
        {pick ? (
          <ProductImage
            src={pick.main.image}
            srcSet={pick.main.srcSet}
            priority={priority}
            sizes={CARD_SIZES}
            className="absolute inset-0 h-full w-full object-contain p-3"
          />
        ) : (
          <ReservedPlate number={number} />
        )}
      </span>
      <span className="flex flex-col gap-y-1 px-3 pt-2 pb-2 lg:pt-1 lg:pb-1">
        <span className="block min-h-4 min-w-0" aria-hidden={brand ? undefined : true}>
          <span className="block break-words text-[12px] font-medium uppercase leading-4 tracking-[0.04em] text-muted">
            {brand ?? "\u00a0"}
          </span>
        </span>
        <span className="block min-h-10 min-w-0 lg:min-h-5">
          <span
            className={`block break-words text-[15px] font-semibold leading-5 ${pick ? "text-ink" : "text-muted"}`}
          >
            {pick ? (productName ?? "\u00a0") : "Pick coming"}
          </span>
        </span>
        <span className="block min-h-4 min-w-0" aria-hidden={price ? undefined : true}>
          <span className="block break-words text-sm leading-4 tabular-nums text-ink">{price ?? "\u00a0"}</span>
        </span>
        <span className="block min-h-8 min-w-0" aria-hidden={why ? undefined : true}>
          <span className="block break-words text-[12px] leading-4 text-muted">{why ?? "\u00a0"}</span>
        </span>
      </span>
    </button>
  );
}
