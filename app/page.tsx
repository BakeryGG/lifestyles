import Link from "next/link";
import { loadCatalog } from "@/lib/catalog";
import { visibleBrands } from "@/lib/present";
import type { Tier } from "@/lib/schema";

const kicker = "text-[11px] font-medium uppercase leading-4 tracking-[0.08em]";

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
    ? "flex h-full min-h-64 w-full flex-col rounded-2xl bg-card p-6 ring-1 ring-inset ring-line hover:ring-ink/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink lg:p-8"
    : "flex h-full min-h-64 w-full cursor-default flex-col rounded-2xl bg-well p-6 text-muted ring-1 ring-inset ring-line lg:p-8";

  const body = (
    <>
      <div>
        <h2 className={`text-2xl font-semibold tracking-tight lg:text-[1.65rem] ${live ? "text-ink" : "text-muted"}`}>
          {tier.name}
        </h2>
        <p className="mt-3 text-[15px] leading-6 text-pretty text-muted">{tier.description}</p>
      </div>
      <div className="mt-auto pt-10">
        <p className={`text-[13px] leading-5 ${live ? "text-ink" : "text-muted"}`}>
          <Brands brands={brands} />
        </p>
        <p className={`mt-6 min-h-5 ${live ? "text-[15px] font-medium text-ink underline decoration-current underline-offset-4" : `${kicker} text-muted`}`}>
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
      className="mx-auto flex min-h-full w-full max-w-5xl scroll-mt-14 flex-col px-6 pt-16 pb-16 outline-none sm:pt-24 lg:pt-28"
    >
      <h1 className="max-w-[14ch] text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-5xl">
        {"Pick how you live. We'll tell you what to buy."}
      </h1>
      <p className="mt-5 max-w-xl text-lg leading-7 text-pretty text-muted">One pick for everything, at your level.</p>
      <ul className="mt-12 grid list-none grid-cols-1 items-stretch gap-4 sm:mt-14 md:grid-cols-3 lg:gap-6">
        {catalog.tiers.map((tier) => (
          <li key={tier.id} className="flex">
            <TierChoice tier={tier} />
          </li>
        ))}
      </ul>
    </main>
  );
}
