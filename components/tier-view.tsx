import { ViewTransition } from "react";
import Link from "next/link";
import { CategoryCard } from "./category-card";
import { KitFilter } from "./kit-filter";
import { LifestyleSwitcher, type SwitcherLifestyle } from "./lifestyle-switcher";
import { Wordmark } from "./wordmark";
import type { KitView, TierGroupView } from "@/lib/present";
import { sectionHeadingId } from "@/lib/section-id";
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
  liveTiers,
}: {
  tier: Pick<Tier, "id" | "name" | "description" | "status">;
  tiers: SwitcherLifestyle[];
  groups: TierGroupView[];
  views: KitView[];
  defaultView: string;
  liveTiers: { id: string; name: string }[];
}) {
  const eagerIds = groups
    .flatMap((group) => group.categories)
    .filter((product) => product.pick && (defaultView === "all" || product.tags.includes(defaultView)))
    .slice(0, 3)
    .map((product) => product.id);
  const priorityFor = (id: string): "high" | "eager" | "lazy" => {
    const index = eagerIds.indexOf(id);
    return index === 0 ? "high" : index > 0 ? "eager" : "lazy";
  };

  return (
    <div className="min-h-full">
      <Header tiers={tiers} currentId={tier.id} />
      <style dangerouslySetInnerHTML={{ __html: viewCss(views) }} />
      <ViewTransition name="kit" share="crossfade" default="none" enter="none" exit="none">
        <main id="content" tabIndex={-1} className="content-focus scroll-mt-16">
          <div id="kit" className="kit-root" data-view={defaultView} data-default-view={defaultView}>
            <div className="mx-auto max-w-[1440px] px-4 pt-6 pb-1 sm:px-6 lg:px-8">
              {tier.status !== "live" ? (
                <p className="mb-3 max-w-2xl text-[14px] leading-6 text-pretty text-muted">
                  <span className="text-ink">{tier.name} is coming soon.</span> The products below match the other lifestyles.
                  {liveTiers.map((item) => (
                    <span key={item.id}>
                      {" "}
                      <Link
                        href={`/${item.id}`}
                        className="text-ink underline decoration-line underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal"
                      >
                        See the {item.name} kit
                      </Link>
                      .
                    </span>
                  ))}
                </p>
              ) : null}
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
                          className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] leading-5 whitespace-nowrap text-ink transition-colors duration-300 ease-catalog hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
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
                  className="hidden h-11 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal sm:inline-flex aria-pressed:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden="true" className="picked-dot h-2 w-2 rounded-full border border-current" />
                  Only picked
                </button>
              </div>
            </div>

            <div className="mx-auto max-w-[1440px] px-4 pt-3 pb-16 sm:px-6 lg:px-8">
              <p data-picked-empty hidden className="py-10 text-[14px] text-muted">
                Nothing picked here yet. Every product in this view still says “Pick coming”.
              </p>
              <div className="kit-grid">
                {groups.map((group) => {
                  const headingId = sectionHeadingId(group.sectionIndex);
                  return (
                    <section key={group.id} className="kit-section" aria-labelledby={headingId}>
                      <h2 id={headingId} className="kit-heading text-[13px] leading-5 tracking-[0.01em] text-muted">
                        {group.section}
                      </h2>
                      {group.categories.map((product) => (
                        <div
                          key={product.id}
                          className="kit-card min-w-0"
                          data-tags={product.tags.join(" ")}
                          data-empty={product.pick ? undefined : ""}
                        >
                          <CategoryCard
                            id={product.id}
                            name={product.name}
                            section={product.primaryName}
                            pick={product.pick}
                            hints={product.hints}
                            priority={priorityFor(product.id)}
                          />
                        </div>
                      ))}
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
          <KitFilter />
        </main>
      </ViewTransition>
    </div>
  );
}
