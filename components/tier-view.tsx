import type { CSSProperties } from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import { CategoryCard } from "./category-card";
import { Wordmark } from "./wordmark";
import type { TierCategoryView, TierGroupView } from "@/lib/present";
import { DESKTOP_COLUMNS, packSections, type PlacedSection } from "@/lib/pack";
import { sectionHeadingId } from "@/lib/section-id";
import type { Tier } from "@/lib/schema";

const segment =
  "inline-flex h-11 min-w-0 items-center justify-center gap-1 rounded-full px-1 text-[10px] leading-none tracking-[-0.01em] whitespace-nowrap transition-colors duration-[380ms] ease-catalog focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal min-[400px]:px-2 min-[400px]:text-[12px] min-[520px]:min-w-[4.75rem] min-[520px]:px-3 min-[520px]:text-[13px]";

type SwitcherTier = Pick<Tier, "id" | "name" | "status">;

function TierSwitcher({ tiers, currentId }: { tiers: SwitcherTier[]; currentId: string }) {
  return (
    <nav aria-label="Lifestyle tier" className="ml-auto min-w-0 flex-1">
      <div className="ml-auto grid w-full max-w-[16.25rem] grid-cols-3 rounded-full bg-field p-0.5 min-[520px]:w-max min-[520px]:max-w-none">
        {tiers.map((tier) => {
          const current = tier.id === currentId;
          const soon = tier.status !== "live";
          const className = `${segment} ${current ? "bg-ink text-white" : soon ? "text-muted" : "text-ink"}`;
          const inner = (
            <>
              {tier.name}
              {soon ? (
                <>
                  <span aria-hidden="true" className="text-[9px] leading-none tracking-normal min-[400px]:text-[10px]">
                    Soon
                  </span>
                  <span className="sr-only">, coming soon</span>
                </>
              ) : null}
              {current ? <span className="sr-only">, current page</span> : null}
            </>
          );
          if (soon) {
            return (
              <span key={tier.id} aria-current={current ? "page" : undefined} className={`${className} cursor-default`}>
                {inner}
              </span>
            );
          }
          return (
            <Link key={tier.id} href={`/${tier.id}`} aria-current={current ? "page" : undefined} className={className}>
              {inner}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Header({ tiers, currentId }: { tiers: SwitcherTier[]; currentId: string }) {
  return (
    <header
      className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 min-[400px]:px-5 sm:gap-4 sm:px-8">
        <Wordmark />
        <TierSwitcher tiers={tiers} currentId={currentId} />
      </div>
    </header>
  );
}

const mainClass = "content-focus scroll-mt-16";

function placeStyle(column: number, row: number, span?: number): CSSProperties {
  return {
    "--kit-col": column,
    "--kit-span": span ?? 1,
    "--kit-row": row,
  } as CSSProperties;
}

/** Eager only for picked images on the desktop first row, so nothing off that row joins the LCP fetch. */
function prioritiesFor(
  groups: TierGroupView[],
  packed: PlacedSection<TierCategoryView>[],
): Map<string, "high" | "eager" | "lazy"> {
  const priorities = new Map<string, "high" | "eager" | "lazy">();
  for (const group of groups) {
    for (const category of group.categories) priorities.set(category.id, "lazy");
  }

  let firstCardRow = Number.POSITIVE_INFINITY;
  const firstRow: { id: string; column: number; hasPick: boolean }[] = [];
  for (const section of packed) {
    for (const placed of section.items) {
      firstCardRow = Math.min(firstCardRow, placed.row);
    }
  }
  for (const section of packed) {
    for (const placed of section.items) {
      if (placed.row !== firstCardRow) continue;
      firstRow.push({
        id: placed.item.id,
        column: placed.column,
        hasPick: placed.item.pick != null,
      });
    }
  }
  firstRow.sort((a, b) => a.column - b.column);

  let eager = 0;
  for (const item of firstRow) {
    if (!item.hasPick) continue;
    priorities.set(item.id, eager === 0 ? "high" : "eager");
    eager += 1;
  }
  return priorities;
}

export function TierView({
  tier,
  tiers,
  groups,
  summary,
  liveTiers,
}: {
  tier: Pick<Tier, "id" | "name" | "description" | "status">;
  tiers: SwitcherTier[];
  groups: TierGroupView[];
  summary: string;
  liveTiers: { id: string; name: string }[];
}) {
  const packed = packSections(
    groups.map((group) => ({ section: group.section, items: group.categories })),
    DESKTOP_COLUMNS,
  );
  const priorities = prioritiesFor(groups, packed);
  const placedBySection = new Map(packed.map((section) => [section.section, section]));

  return (
    <div className="min-h-full">
      <Header tiers={tiers} currentId={tier.id} />
      <ViewTransition name="kit" share="crossfade" default="none" enter="none" exit="none">
        <main id="content" tabIndex={-1} className={mainClass}>
          <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-2 sm:px-6 lg:px-8">
            {tier.status !== "live" ? (
              <p className="mb-3 max-w-2xl text-[14px] leading-6 text-pretty text-muted">
                <span className="text-ink">{tier.name} is coming soon.</span> The slots below match the other tiers.
                {liveTiers.length > 0 ? (
                  <>
                    {" "}
                    {liveTiers.map((item, index) => (
                      <span key={item.id}>
                        {index > 0 ? " " : null}
                        <Link
                          href={`/${item.id}`}
                          className="text-ink underline decoration-line underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
                        >
                          See the {item.name} kit
                        </Link>
                        .
                      </span>
                    ))}
                  </>
                ) : null}
              </p>
            ) : null}
            <h1 className="text-[1.25rem] leading-7 font-normal tracking-[-0.02em] text-ink">{summary}</h1>
          </div>
          <div className="mx-auto max-w-[1440px] px-4 pt-4 pb-16 sm:px-6 lg:px-8">
            <div className="kit-grid">
              {groups.map((group) => {
                const placed = placedBySection.get(group.section);
                const headingId = sectionHeadingId(group.sectionIndex);
                return (
                  <section key={group.section} aria-labelledby={headingId}>
                    <h2
                      id={headingId}
                      style={placed ? placeStyle(placed.column, placed.headerRow, placed.span) : undefined}
                      className="kit-heading text-[13px] leading-5 tracking-[0.01em] text-muted"
                    >
                      {group.section}
                    </h2>
                    {group.categories.map((category) => {
                      const spot = placed?.items.find((item) => item.item.id === category.id);
                      return (
                        <div
                          key={category.id}
                          className="kit-card min-w-0"
                          style={spot ? placeStyle(spot.column, spot.row) : undefined}
                        >
                          <CategoryCard
                            id={category.id}
                            name={category.name}
                            section={group.section}
                            pick={category.pick}
                            hints={category.hints}
                            priority={priorities.get(category.id) ?? "lazy"}
                          />
                        </div>
                      );
                    })}
                  </section>
                );
              })}
            </div>
          </div>
        </main>
      </ViewTransition>
    </div>
  );
}
