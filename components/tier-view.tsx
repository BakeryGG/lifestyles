import { ViewTransition } from "react";
import { KitGrid, type GridGroup } from "./kit-grid";
import { KitFilter } from "./kit-filter";
import { LifestyleSwitcher, type SwitcherLifestyle } from "./lifestyle-switcher";
import { Wordmark } from "./wordmark";
import type { KitView, TierGroupView } from "@/lib/present";
import type { Tier } from "@/lib/schema";

function Header({ tiers, currentId }: { tiers: SwitcherLifestyle[]; currentId: string }) {
  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md" style={{ viewTransitionName: "site-header" }}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-3 min-[400px]:px-5 sm:gap-4 sm:px-8">
        <Wordmark />
        <nav aria-label="Lifestyles" className="flex min-w-0 flex-1 items-center">
          <LifestyleSwitcher lifestyles={tiers} currentId={currentId} />
        </nav>
      </div>
    </header>
  );
}

const CSS_ID = /^[a-z0-9-]+$/;

/** Per-view rules, generated from data. Filtering is a data attribute swap: no per-card hydration. */
function viewCss(views: KitView[]): string {
  const rules: string[] = [];
  for (const view of views) {
    if (!CSS_ID.test(view.id)) continue;
    const root = `.kit-root[data-view="${view.id}"]`;
    if (view.id !== "all") rules.push(`${root} .kit-card:not([data-tags~="${view.id}"]){display:none}`);
    rules.push(`${root} [data-kit-summary="${view.id}"]{display:inline}`);
    rules.push(`${root} [data-chip="${view.id}"]{background:var(--color-ink);color:var(--color-paper);border-color:var(--color-ink)}`);
  }
  return rules.join("\n");
}

export function TierView({
  tier,
  tiers,
  groups,
  views,
  defaultView,
}: {
  tier: Pick<Tier, "id" | "name" | "description" | "status">;
  tiers: SwitcherLifestyle[];
  groups: TierGroupView[];
  views: KitView[];
  defaultView: string;
}) {
  const eagerIds = groups
    .flatMap((group) => group.categories)
    .filter((product) => product.pick && (defaultView === "all" || product.tags.includes(defaultView)))
    .slice(0, 3)
    .map((product) => product.id);
  const gridGroups: GridGroup[] = groups.map((group) => ({
    id: group.id,
    section: group.section,
    sectionIndex: group.sectionIndex,
    cards: group.categories.map((product) => ({
      id: product.id,
      name: product.name,
      tags: product.tags,
      pick: product.pick
        ? {
            main: {
              brand: product.pick.main.brand,
              name: product.pick.main.name,
              price: product.pick.main.price,
              currency: product.pick.main.currency,
              image: product.pick.main.image,
              srcSet: product.pick.main.srcSet,
              url: "",
              why: "",
            },
          }
        : null,
    })),
  }));

  return (
    <div className="min-h-full">
      <Header tiers={tiers} currentId={tier.id} />
      <style dangerouslySetInnerHTML={{ __html: viewCss(views) }} />
      <ViewTransition name="kit" share="crossfade" default="none" enter="none" exit="none">
        <main id="content" tabIndex={-1} className="content-focus scroll-mt-16">
          <div id="kit" className="kit-root" data-view={defaultView} data-default-view={defaultView}>
            <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-1 sm:px-6 lg:px-8">
              <h1 className="text-[1.25rem] leading-7 font-normal tracking-[-0.02em] text-ink" aria-live="polite">
                {views.map((view) => (
                  <span key={view.id} data-kit-summary={view.id} className="kit-summary">
                    {view.summary}
                  </span>
                ))}
              </h1>
            </div>

            <div className="sticky top-16 z-20 bg-paper/95 backdrop-blur-md">
              <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
                <nav aria-label="Categories" className="chip-scroll min-w-0 flex-1">
                  <ul className="flex gap-1.5">
                    {views.map((view) => (
                      <li key={view.id} className="shrink-0">
                        <a
                          href={view.id === defaultView ? "?" : `?cat=${view.id}`}
                          data-chip={view.id}
                          data-picked-count={view.picked}
                          aria-current={view.id === defaultView ? "true" : undefined}
                          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] leading-5 whitespace-nowrap text-ink transition-colors duration-300 ease-catalog hover:border-ink focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
                        >
                          {view.name}
                          <span className="font-mono text-[11px] opacity-60">{view.count}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
                <button
                  type="button"
                  data-picked-toggle
                  aria-pressed="false"
                  aria-label="Only picked"
                  className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full px-2 text-[13px] text-muted hover:text-ink focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal sm:gap-2 sm:px-3 aria-pressed:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden="true" className="picked-dot h-2 w-2 rounded-full border border-current" />
                  <span className="sm:hidden">Picked</span>
                  <span className="hidden sm:inline">Only picked</span>
                </button>
              </div>
            </div>

            <div className="mx-auto max-w-[1440px] px-4 pt-3 pb-16 sm:px-6 lg:px-8">
              <p data-picked-empty hidden className="py-10 text-[14px] text-muted">
                Nothing picked here yet. Every product in this view still says “Pick coming”.
              </p>
              <KitGrid groups={gridGroups} eagerIds={eagerIds} />
            </div>
          </div>
          <KitFilter />
        </main>
      </ViewTransition>
    </div>
  );
}
