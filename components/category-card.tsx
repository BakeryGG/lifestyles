import { displayText, formatPrice, type PresentedPick } from "@/lib/present";
import { ProductImage } from "./product-image";

const kicker = "text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-muted";

function labelClass(label: { base: boolean; md: boolean; lg: boolean; xl: boolean }): string {
  return [
    label.base ? "visible" : "invisible",
    label.md ? "md:visible" : "md:invisible",
    label.lg ? "lg:visible" : "lg:invisible",
    label.xl ? "xl:visible" : "xl:invisible",
  ].join(" ");
}

export function CategoryCard({
  id,
  name,
  section,
  pick,
  priority,
  label,
}: {
  id: string;
  name: string;
  section: string;
  pick: PresentedPick | null;
  priority: boolean;
  label: { base: boolean; md: boolean; lg: boolean; xl: boolean };
}) {
  const brand = pick ? displayText(pick.main.brand) : null;
  const productName = pick ? displayText(pick.main.name) : null;
  const why = pick ? displayText(pick.main.why) : null;

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-1 flex min-h-4 items-end border-b border-line">
        <h2 className={`${kicker} ${labelClass(label)}`}>{section}</h2>
      </div>
      <button
        type="button"
        id={`card-${id}`}
        data-pick={id}
        aria-haspopup="dialog"
        className="flex min-h-0 w-full min-w-0 flex-1 cursor-pointer flex-col rounded-2xl bg-card text-left ring-1 ring-inset ring-line hover:ring-ink/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <span className="relative block aspect-[4/3] w-full bg-stage">
          {pick ? (
            <ProductImage
              src={pick.main.image}
              priority={priority}
              sizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 768px) 30vw, 46vw"
              className="absolute inset-0 h-full w-full object-contain p-3"
            />
          ) : (
            <span
              className="absolute inset-3 flex items-center justify-center rounded-md ring-1 ring-inset ring-line"
              aria-hidden="true"
            >
              <span className="h-px w-8 bg-line" />
            </span>
          )}
        </span>
        <span className="block px-3 pt-2 pb-2.5">
          <span className="block min-h-5 text-[15px] font-medium leading-5 tracking-tight text-ink">
            {name}
          </span>
          <span className="mt-1 grid grid-rows-[1rem_1.25rem_1.25rem_2rem] gap-y-0.5">
            <span className={`${kicker} block truncate`}>{brand ?? "\u00a0"}</span>
            <span
              className={`block truncate text-[14px] font-medium leading-5 ${pick ? "text-ink" : "text-muted"}`}
            >
              {pick ? (productName ?? "\u00a0") : "Pick coming"}
            </span>
            <span className="block truncate text-[13px] leading-5 tabular-nums text-ink">
              {pick ? formatPrice(pick.main.price, pick.main.currency) : "\u00a0"}
            </span>
            <span className="line-clamp-2 text-[12px] leading-4 text-muted">{why ?? "\u00a0"}</span>
          </span>
        </span>
      </button>
    </div>
  );
}
