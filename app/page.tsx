import Link from "next/link";
import { loadCatalog } from "@/lib/catalog";
import { visibleBrands } from "@/lib/present";
import type { Tier } from "@/lib/schema";

function Brands({ brands }: { brands: string[] }) {
  if (brands.length === 0) {
    return <span className="text-muted">Brands coming</span>;
  }
  return brands.map((brand, index) => (
    <span key={`${brand}-${index}`} className="whitespace-nowrap">
      {index > 0 ? (
        <>
          <span aria-hidden="true" className="text-muted">
            {" · "}
          </span>
          <span className="sr-only">, </span>
        </>
      ) : null}
      {brand}
    </span>
  ));
}

function TierChoice({ tier }: { tier: Tier }) {
  const brands = visibleBrands(tier.exampleBrands);
  const live = tier.status === "live";
  const className = live
    ? "group flex h-full w-full flex-col rounded-2xl bg-card p-6 ring-1 ring-inset ring-line hover:ring-ink/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:min-h-64 lg:p-8"
    : "flex h-full w-full cursor-default flex-col rounded-2xl bg-well p-6 text-muted ring-1 ring-inset ring-line lg:min-h-64 lg:p-8";

  const body = (
    <>
      <div>
        <h2 className={`text-2xl font-semibold tracking-tight lg:text-[1.65rem] ${live ? "text-ink" : "text-muted"}`}>
          {tier.name}
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-pretty text-muted">{tier.description}</p>
      </div>
      <div className="mt-6 lg:mt-auto lg:pt-8">
        <p className={`text-[13px] leading-5 ${live ? "text-ink" : "text-muted"}`}>
          <Brands brands={brands} />
        </p>
        <p className={`mt-4 min-h-5 text-[13px] font-medium leading-5 ${live ? "text-ink group-hover:underline" : "text-muted"}`}>
          {live ? (
            <>
              See the kit <span aria-hidden="true">→</span>
            </>
          ) : (
            "Coming soon"
          )}
        </p>
      </div>
    </>
  );

  if (!live) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link href={`/${tier.id}`} className={className} style={{ boxShadow: `inset 0 2px 0 ${tier.accent}` }}>
      {body}
    </Link>
  );
}

export default function HomePage() {
  const catalog = loadCatalog();

  return (
    <main
      id="content"
      tabIndex={-1}
      className="content-focus mx-auto flex min-h-full w-full max-w-5xl scroll-mt-14 flex-col px-6 pt-12 pb-16 sm:pt-16 lg:pt-24"
    >
      <h1 className="max-w-[16ch] text-balance text-[2.5rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-5xl">
        {"Pick how you live. We'll tell you what to buy."}
      </h1>
      <p className="mt-4 max-w-xl text-lg leading-7 text-pretty text-muted">One pick for everything, at your level.</p>
      <ul className="mt-8 grid list-none grid-cols-1 items-stretch gap-4 sm:mt-12 lg:mt-14 lg:grid-cols-3 lg:gap-6">
        {catalog.tiers.map((tier) => (
          <li key={tier.id} className="flex">
            <TierChoice tier={tier} />
          </li>
        ))}
      </ul>
    </main>
  );
}
