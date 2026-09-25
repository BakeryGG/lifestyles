import Link from "next/link";
import { CategoryCard } from "./category-card";
import { accentColors, showsSectionLabel, type FlatCategory } from "@/lib/present";
import type { Tier } from "@/lib/schema";

const segment =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full px-3 text-[13px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

type SwitcherTier = Pick<Tier, "id" | "name" | "status">;

function TierSwitcher({
  tiers,
  currentId,
  accent,
}: {
  tiers: SwitcherTier[];
  currentId: string;
  accent: string;
}) {
  const colors = accentColors(accent);
  const selected = {
    backgroundColor: "#fffcf8",
    color: "#1c1c1a",
    boxShadow: `inset 0 0 0 1.5px ${colors.buttonBg}`,
  };

  return (
    <nav aria-label="Lifestyle tier" className="ml-auto shrink-0">
      <div className="inline-grid grid-flow-col auto-cols-fr rounded-full bg-well p-1">
        {tiers.map((tier) => {
          const current = tier.id === currentId;
          if (tier.status !== "live") {
            return (
              <span
                key={tier.id}
                role="link"
                aria-disabled="true"
                aria-current={current ? "page" : undefined}
                title="Coming soon"
                className={`${segment} cursor-default ${current ? "" : "text-muted"}`}
                style={current ? selected : undefined}
              >
                {tier.name}
                <span className="sr-only">, coming soon</span>
              </span>
            );
          }
          return (
            <Link
              key={tier.id}
              href={`/${tier.id}`}
              aria-current={current ? "page" : undefined}
              className={`${segment} ${current ? "" : "text-ink"}`}
              style={current ? selected : undefined}
            >
              {tier.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Header({
  tiers,
  currentId,
  accent,
}: {
  tiers: SwitcherTier[];
  currentId: string;
  accent: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex h-11 shrink-0 items-center text-[15px] font-semibold tracking-tight text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          Lifestyles
        </Link>
        <TierSwitcher tiers={tiers} currentId={currentId} accent={accent} />
      </div>
    </header>
  );
}

export function TierView({
  tier,
  tiers,
  categories,
  summary,
  liveTiers,
}: {
  tier: Pick<Tier, "id" | "name" | "description" | "status" | "accent">;
  tiers: SwitcherTier[];
  categories: FlatCategory[];
  summary: string;
  liveTiers: { id: string; name: string }[];
}) {
  const colors = accentColors(tier.accent);
  const sections = categories.map((category) => category.section);

  return (
    <div className="min-h-full">
      <Header tiers={tiers} currentId={tier.id} accent={tier.accent} />
      {tier.status !== "live" ? (
        <main id="content" tabIndex={-1} className="scroll-mt-14 outline-none">
          <div className="mx-auto flex max-w-xl flex-col items-center px-6 pt-20 pb-16 text-center">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              {tier.name} is coming soon
            </h1>
            <p className="mt-4 text-lg leading-7 text-pretty text-muted">{tier.description}</p>
            {liveTiers.length > 0 ? (
              <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
                {liveTiers.map((item) => (
                  <Link
                    key={item.id}
                    href={`/${item.id}`}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-current underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                  >
                    See the {item.name} kit
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </main>
      ) : (
        <main id="content" tabIndex={-1} className="scroll-mt-14 outline-none">
          <div className="border-b border-line bg-paper" style={{ boxShadow: `inset 0 2px 0 ${colors.raw}` }}>
            <div className="mx-auto max-w-[1440px] px-4 py-2.5 sm:px-6">
              <h1 className="text-[17px] font-medium leading-6 tracking-tight text-ink sm:text-lg">{summary}</h1>
            </div>
          </div>
          <div className="mx-auto max-w-[1440px] px-4 pt-3 sm:px-6">
            <div className="grid grid-cols-2 items-stretch gap-x-3 gap-y-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-x-4">
              {categories.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  section={category.section}
                  pick={category.pick}
                  priority={index < 2}
                  label={{
                    base: showsSectionLabel(sections, index, 2),
                    md: showsSectionLabel(sections, index, 3),
                    lg: showsSectionLabel(sections, index, 4),
                    xl: showsSectionLabel(sections, index, 5),
                  }}
                />
              ))}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
