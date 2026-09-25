import { displayText, formatPrice, type PresentedPick } from "@/lib/present";
import { ProductImage } from "./product-image";
import { ReservedPlate } from "./reserved-plate";

const CARD_SIZES = "(min-width: 1024px) 18vw, 45vw";

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
      data-pick={id}
      aria-haspopup="dialog"
      className="group relative flex h-full w-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-2xl bg-card text-left scroll-mt-16 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-line group-hover:ring-ink"
      />
      <span className="block px-3 pt-1 lg:pt-2">
        <span className="block h-8 overflow-hidden lg:h-4">
          <span className="line-clamp-2 text-[12px] font-medium leading-4 text-muted lg:line-clamp-1">{name}</span>
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
      <span className="grid grid-rows-[1rem_2.5rem_1rem_2rem] gap-y-1 px-3 pt-2 pb-2 lg:grid-rows-[1rem_1.25rem_1rem_2rem] lg:pt-1 lg:pb-1">
        <span className="block min-w-0 overflow-hidden" aria-hidden={brand ? undefined : true}>
          <span className="block truncate text-[12px] font-medium uppercase leading-4 tracking-[0.04em] text-muted">
            {brand ?? "\u00a0"}
          </span>
        </span>
        <span className="block min-w-0 overflow-hidden">
          <span
            className={`line-clamp-2 text-[15px] font-semibold leading-5 lg:line-clamp-1 ${pick ? "text-ink" : "text-muted"}`}
          >
            {pick ? (productName ?? "\u00a0") : "Pick coming"}
          </span>
        </span>
        <span className="block min-w-0 overflow-hidden" aria-hidden={price ? undefined : true}>
          <span className="block truncate text-sm leading-4 tabular-nums text-ink">{price ?? "\u00a0"}</span>
        </span>
        <span className="block min-w-0 overflow-hidden" aria-hidden={why ? undefined : true}>
          <span className="line-clamp-2 text-[12px] leading-4 text-muted">{why ?? "\u00a0"}</span>
        </span>
      </span>
    </button>
  );
}
