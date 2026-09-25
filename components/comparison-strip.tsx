import Link from "next/link";
import { EmptyPlate } from "./empty-plate";
import { HScroll } from "./h-scroll";
import { ProductImage } from "./product-image";
import type { CompareRow } from "@/lib/present";
import type { Tier } from "@/lib/schema";

const THUMB = "64px";

export function ComparisonStrip({
  tiers,
  rows,
  srcSets,
}: {
  tiers: Pick<Tier, "id" | "name" | "status">[];
  rows: CompareRow[];
  srcSets: Record<string, string | undefined>;
}) {
  const soon = new Set(tiers.filter((tier) => tier.status !== "live").map((tier) => tier.id));
  const minWidth = `${Math.max(18, 9 + tiers.length * 11)}rem`;
  return (
    <HScroll label="Compare primary lifestyles" className="compare-scroll mt-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal">
      <table className="compare-table" style={{ minWidth }}>
        <caption className="sr-only">
          Main picks compared across primary lifestyles
          {tiers.length === 1 ? ". Only one primary lifestyle is in the catalog." : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="compare-sticky border-b border-line py-2 pr-4 text-left align-bottom">
              <span className="sr-only">Category</span>
            </th>
            {tiers.map((tier) => (
              <th
                key={tier.id}
                scope="col"
                className="border-b border-line py-2 pr-4 text-left align-bottom font-normal"
              >
                {tier.status === "live" ? (
                  <Link
                    href={`/${tier.id}`}
                    className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-ink underline decoration-line underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
                  >
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-signal" />
                    {tier.name}
                  </Link>
                ) : (
                  <span className="inline-flex min-h-11 items-center gap-1.5 text-[13px] text-muted">
                    {tier.name}
                    <span aria-hidden="true" className="text-[11px]">
                      Soon
                    </span>
                    <span className="sr-only">, coming soon</span>
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.categoryId}>
              <th
                scope="row"
                className="compare-sticky min-w-[8.5rem] border-b border-line py-3 pr-4 text-left align-middle font-normal"
              >
                <span className="block text-[11px] leading-4 text-muted">{row.section}</span>
                <span className="block text-[13px] leading-5 text-ink">{row.categoryName}</span>
              </th>
              {row.cells.map((cell) => (
                <td
                  key={cell.tierId}
                  className={`border-b border-line py-3 pr-4 align-middle ${soon.has(cell.tierId) ? "compare-soon" : ""}`}
                >
                  {cell.empty ? (
                    <span className="flex items-center gap-3">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                        <EmptyPlate />
                      </span>
                      <span className="text-[13px] leading-5 text-muted">Pick coming</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-3">
                      <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-field">
                        {cell.image ? (
                          <ProductImage
                            src={cell.image}
                            srcSet={srcSets[`${cell.tierId}:${row.categoryId}`]}
                            sizes={THUMB}
                            className="absolute inset-0 h-full w-full object-contain p-2"
                          />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        {cell.brand ? (
                          <span className="block text-[12px] leading-4 text-muted">{cell.brand}</span>
                        ) : null}
                        <span className="block text-[13px] leading-5 text-ink">{cell.name}</span>
                        {cell.price ? (
                          <span className="mt-0.5 block font-mono text-[13px] leading-5 text-ink">{cell.price}</span>
                        ) : null}
                      </span>
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </HScroll>
  );
}
