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

function columnClass(count: number, hero: boolean): string {
  if (count <= 1) return hero ? "grid-cols-1 max-w-xl" : "grid-cols-1 max-w-md";
  // Two secondaries share the primary tracks so they stay narrower than a full row.
  if (!hero) return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
}

function CardBody({ card, hero }: { card: LandingTierCard; hero: boolean }) {
  const live = card.status === "live";
  const tone = live ? "text-ink" : "text-muted";
  const Title = hero ? "h2" : "h3";
  return (
    <>
      <Title className={`${hero ? "text-[1.75rem]" : "text-[1.35rem]"} leading-none font-normal tracking-[-0.02em] ${tone}`}>
        {card.name}
      </Title>
      <p className={`${hero ? "mt-3" : "mt-2"} text-[14px] leading-5 text-pretty text-muted`}>{card.whoFor ?? card.description}</p>
      <p className={`${hero ? "mt-6" : "mt-4"} text-[13px] leading-5`}>
        <Brands brands={card.brands} tone={tone} />
      </p>
      <p className={`${hero ? "mt-6" : "mt-4"} text-[13px] leading-5 text-muted`}>{card.anchorLine}</p>
      <p className={`mt-1 text-[13px] leading-5 ${tone}`}>{card.kitLine}</p>
      <div className={`mt-auto ${hero ? "pt-8" : "pt-6"}`}>
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

function CardGrid({ cards, hero }: { cards: LandingTierCard[]; hero: boolean }) {
  if (cards.length === 0) return null;
  return (
    <ul className={`grid list-none items-stretch gap-3 ${columnClass(cards.length, hero)}`}>
      {cards.map((card) => {
        const live = card.status === "live";
        const surface = hero
          ? "bg-field"
          : "bg-paper ring-1 ring-inset ring-line";
        const className = live
          ? `group flex h-full flex-col rounded-2xl transition-colors duration-[380ms] ease-catalog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal ${surface} ${hero ? "p-6 hover:bg-[#efefef] sm:p-7" : "p-5 hover:bg-field"}`
          : `flex h-full cursor-default flex-col rounded-2xl ${surface} ${hero ? "p-6 sm:p-7" : "p-5"}`;
        return (
          <li key={card.id} className="flex min-w-0">
            {live ? (
              <Link href={`/${card.id}`} className={className}>
                <CardBody card={card} hero={hero} />
              </Link>
            ) : (
              <div className={className}>
                <CardBody card={card} hero={hero} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function LandingTiers({ cards }: { cards: LandingTierCard[] }) {
  const primary = cards.filter((card) => card.group !== "secondary");
  const secondary = cards.filter((card) => card.group === "secondary");
  return (
    <div className="mt-12 sm:mt-16">
      <CardGrid cards={primary} hero />
      {secondary.length > 0 ? (
        <section className="mt-14 sm:mt-20" aria-labelledby="more-ways">
          <h2 id="more-ways" className="text-[1.25rem] leading-none font-normal tracking-[-0.02em] text-ink">
            Or pick a way of living
          </h2>
          <p className="mt-2 max-w-md text-[14px] leading-5 text-muted">Same list of things. A narrower brief.</p>
          <div className="mt-5">
            <CardGrid cards={secondary} hero={false} />
          </div>
        </section>
      ) : null}
    </div>
  );
}
