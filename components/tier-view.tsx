import type { CSSProperties } from "react";
import { CategoryCard } from "./category-card";
import { accentColors, type TierCategoryView, type TierGroupView } from "@/lib/present";
import { DESKTOP_COLUMNS, packSections, type PlacedSection } from "@/lib/pack";
import { sectionHeadingId } from "@/lib/section-id";
import type { Tier } from "@/lib/schema";

const segment =
  "inline-flex min-h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-full px-2 text-[12px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:px-3 sm:text-[13px]";

const sectionHeading = "border-b border-line pb-1 text-[12px] font-medium leading-4 text-muted";

type SwitcherTier = Pick<Tier, "id" | "name" | "status">;

const selectedSegment = {
  backgroundColor: "#fffcf8",
  color: "#1c1c1a",
  boxShadow: "inset 0 0 0 1.5px #1c1c1a",
};

function TierSwitcher({ tiers, currentId }: { tiers: SwitcherTier[]; currentId: string }) {
  return (
    <nav aria-label="Lifestyle tier" className="ml-auto min-w-0">
      <div className="inline-grid max-w-full grid-flow-col auto-cols-fr rounded-full bg-well p-1">
        {tiers.map((tier) => {
          const current = tier.id === currentId;
          if (tier.status !== "live") {
            return (
              <span
                key={tier.id}
                title="Coming soon"
                className={`${segment} cursor-default text-muted underline decoration-dotted decoration-from-font underline-offset-4`}
                style={current ? selectedSegment : undefined}
              >
                {tier.name}
                <sup className="ml-1 hidden text-[10px] font-semibold leading-none sm:inline" aria-hidden="true">
                  Soon
                </sup>
                <span className="sr-only">, coming soon</span>
                {current ? <span className="sr-only">, current page</span> : null}
              </span>
            );
          }
          return (
            <a
              key={tier.id}
              href={`/${tier.id}`}
              aria-current={current ? "page" : undefined}
              className={`${segment} ${current ? "" : "text-ink"}`}
              style={current ? selectedSegment : undefined}
            >
              {tier.name}
              {current ? <span className="sr-only">, current page</span> : null}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function Header({ tiers, currentId }: { tiers: SwitcherTier[]; currentId: string }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1440px] flex-nowrap items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {/* Plain anchor: a full load lets the cross-document view transition run. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          className="inline-flex h-11 shrink items-center text-[14px] font-semibold tracking-tight text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:text-[15px]"
        >
          Lifestyles
        </a>
        <TierSwitcher tiers={tiers} currentId={currentId} />
      </div>
    </header>
  );
}

const mainClass = "content-focus scroll-mt-14";

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
  tier: Pick<Tier, "id" | "name" | "description" | "status" | "accent">;
  tiers: SwitcherTier[];
  groups: TierGroupView[];
  summary: string;
  liveTiers: { id: string; name: string }[];
}) {
  const colors = accentColors(tier.accent);
  const packed = packSections(
    groups.map((group) => ({ section: group.section, items: group.categories })),
    DESKTOP_COLUMNS,
  );
  const priorities = prioritiesFor(groups, packed);
  const placedBySection = new Map(packed.map((section) => [section.section, section]));

  return (
    <div className="min-h-full">
      <Header tiers={tiers} currentId={tier.id} />
      {tier.status !== "live" ? (
        <main id="content" tabIndex={-1} className={mainClass}>
          <div className="mx-auto flex max-w-xl flex-col items-center px-6 pt-16 pb-16 text-center sm:pt-20">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{tier.name} is coming soon</h1>
            <p className="mt-4 text-lg leading-7 text-pretty text-muted">{tier.description}</p>
            {liveTiers.length > 0 ? (
              <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
                {liveTiers.map((item) => (
                  <a
                    key={item.id}
                    href={`/${item.id}`}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-ink underline decoration-current underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
                  >
                    See the {item.name} kit
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </main>
      ) : (
        <main id="content" tabIndex={-1} className={mainClass}>
          <div className="border-b border-line bg-paper" style={{ boxShadow: `inset 0 2px 0 ${colors.raw}` }}>
            <div className="mx-auto max-w-[1440px] px-4 py-2 sm:px-6">
              <h1 className="text-base font-medium leading-6 tracking-tight text-ink">{summary}</h1>
            </div>
          </div>
          <div className="mx-auto max-w-[1440px] px-4 pt-2 pb-2 sm:px-6">
            <div className="kit-grid">
              {groups.map((group) => {
                const placed = placedBySection.get(group.section);
                const headingId = sectionHeadingId(group.sectionIndex);
                return (
                  <section key={group.section} aria-labelledby={headingId}>
                    <h2
                      id={headingId}
                      style={placed ? placeStyle(placed.column, placed.headerRow, placed.span) : undefined}
                      className={`kit-heading ${sectionHeading}`}
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
                            pick={category.pick}
                            number={category.number}
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
      )}
    </div>
  );
}
