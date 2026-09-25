import type { CSSProperties } from "react";
import { ViewTransition } from "react";
import Link from "next/link";
import { CategoryCard } from "./category-card";
import { LifestyleSwitcher, type SwitcherLifestyle } from "./lifestyle-switcher";
import { Wordmark } from "./wordmark";
import type { TierCategoryView, TierGroupView } from "@/lib/present";
import { DESKTOP_COLUMNS, packSections, type PlacedSection } from "@/lib/pack";
import { sectionHeadingId } from "@/lib/section-id";
import type { Tier } from "@/lib/schema";

function Header({ tiers, currentId }: { tiers: SwitcherLifestyle[]; currentId: string }) {
  return (
    <header
      className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md"
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 min-[400px]:px-5 sm:gap-4 sm:px-8">
        <Wordmark />
        <nav aria-label="Lifestyles" className="flex min-w-0 flex-1 items-center">
          <LifestyleSwitcher lifestyles={tiers} currentId={currentId} />
        </nav>
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
  tiers: SwitcherLifestyle[];
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
                <span className="text-ink">{tier.name} is coming soon.</span> The slots below match the other lifestyles.
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
