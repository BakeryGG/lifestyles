import Link from "next/link";
import { loadCatalog } from "@/lib/catalog";
import { visibleBrands } from "@/lib/present";
import type { Tier } from "@/lib/schema";

function TierChoice({ tier }: { tier: Tier }) {
  const brands = visibleBrands(tier.exampleBrands);
  const live = tier.status === "live";
  const className = live
    ? "flex h-full min-h-64 w-full flex-col rounded-2xl border border-line bg-card p-8 transition-colors hover:border-ink/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    : "flex h-full min-h-64 w-full cursor-default flex-col rounded-2xl border border-line bg-well p-8 text-muted";

  const body = (
    <>
      <div>
        <h2 className={`text-[1.65rem] font-semibold tracking-tight ${live ? "text-ink" : "text-muted"}`}>
          {tier.name}
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-muted">{tier.description}</p>
      </div>
      <div className="mt-auto pt-12">
        <p className={`text-[13px] leading-5 ${live ? "text-ink" : "text-muted"}`}>
          {brands.length > 0 ? (
            brands.map((brand, index) => (
              <span key={`${brand}-${index}`}>
                {index > 0 ? <span className="px-1.5 text-muted">·</span> : null}
                {brand}
              </span>
            ))
          ) : (
            <span className="text-muted">Brands coming</span>
          )}
        </p>
        <p className={`mt-6 min-h-4 text-[12px] font-medium uppercase leading-4 tracking-[0.16em] ${live ? "text-ink" : "text-muted"}`}>
          {live ? "See the kit" : "Coming soon"}
        </p>
      </div>
    </>
  );

  if (!live) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link
      href={`/${tier.id}`}
      className={className}
      style={{ borderTopWidth: 2, borderTopColor: tier.accent }}
    >
      {body}
    </Link>
  );
}

export default function HomePage() {
  const catalog = loadCatalog();

  return (
    <main id="content" className="page-enter mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-16 sm:py-20">
      <div className="my-auto w-full">
        <h1 className="max-w-[14ch] text-[2.65rem] font-semibold leading-[1.02] tracking-[-0.035em] text-ink sm:text-5xl">
          {"Pick how you live. We'll tell you what to buy."}
        </h1>
        <p className="mt-5 text-lg leading-7 text-muted">One pick for everything, at your level.</p>
        <ul className="mt-14 grid list-none grid-cols-1 items-stretch gap-5 md:grid-cols-3 md:gap-6">
          {catalog.tiers.map((tier) => (
            <li key={tier.id} className="flex">
              <TierChoice tier={tier} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
