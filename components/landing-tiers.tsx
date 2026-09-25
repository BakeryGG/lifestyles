import Link from "next/link";
import type { LandingTierCard } from "@/lib/present";

function Brands({ brands, tone }: { brands: string[]; tone: string }) {
  if (brands.length === 0) {
    return <span className="text-muted">Brands coming</span>;
  }
  return brands.map((brand, index) => (
    <span key={`${brand}-${index}`} className={`whitespace-nowrap ${tone}`}>
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

function CardBody({ card }: { card: LandingTierCard }) {
  const live = card.status === "live";
  const tone = live ? "text-ink" : "text-muted";
  return (
    <>
      <h2 className={`text-[1.75rem] leading-none font-normal tracking-[-0.02em] ${tone}`}>{card.name}</h2>
      <p className="mt-3 text-[14px] leading-5 text-pretty text-muted">{card.whoFor ?? card.description}</p>
      <p className="mt-6 text-[13px] leading-5">
        <Brands brands={card.brands} tone={tone} />
      </p>
      <p className="mt-6 text-[13px] leading-5 text-muted">{card.anchorLine}</p>
      <p className={`mt-1 text-[13px] leading-5 ${tone}`}>{card.kitLine}</p>
      <div className="mt-auto pt-8">
        {live ? (
          <span className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-[13px] text-white">
            See the kit <span aria-hidden="true">→</span>
          </span>
        ) : (
          <p className="inline-flex min-h-11 items-center text-[13px] leading-5 text-muted">Coming soon</p>
        )}
      </div>
    </>
  );
}

export function LandingTiers({ cards }: { cards: LandingTierCard[] }) {
  return (
    <ul className="mt-12 grid list-none grid-cols-1 items-stretch gap-3 sm:mt-16 md:grid-cols-3">
      {cards.map((card) => {
        const live = card.status === "live";
        const className = live
          ? "group flex h-full flex-col rounded-2xl bg-field p-6 transition-colors duration-[380ms] ease-catalog hover:bg-[#efefef] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:p-7"
          : "flex h-full cursor-default flex-col rounded-2xl bg-field p-6 sm:p-7";
        return (
          <li key={card.id} className="flex">
            {live ? (
              <Link href={`/${card.id}`} className={className}>
                <CardBody card={card} />
              </Link>
            ) : (
              <div className={className}>
                <CardBody card={card} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
