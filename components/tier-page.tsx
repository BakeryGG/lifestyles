"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Tier } from "@/lib/schema";
import { accentColors, type TierGroupView } from "@/lib/present";
import { CategoryCard } from "./category-card";
import { PickDrawer } from "./pick-drawer";

export type TierPageModel = {
  tier: Pick<Tier, "id" | "name" | "description" | "status" | "accent">;
  tiers: Pick<Tier, "id" | "name" | "status">[];
  groups: TierGroupView[];
  summary: string;
  liveTiers: { id: string; name: string }[];
};

function readyIds(groups: TierGroupView[]): Set<string> {
  return new Set(
    groups.flatMap((group) => group.categories.filter((category) => category.pick).map((category) => category.id)),
  );
}

function TierSwitcher({
  tiers,
  currentId,
  accent,
}: {
  tiers: TierPageModel["tiers"];
  currentId: string;
  accent: string;
}) {
  const colors = accentColors(accent);
  return (
    <nav aria-label="Lifestyle tier" className="ml-auto max-w-full">
      <div className="inline-flex max-w-full flex-wrap items-center justify-end gap-1 rounded-full bg-well p-1">
        {tiers.map((tier) => {
          const current = tier.id === currentId;
          const base =
            "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
          if (tier.status !== "live") {
            return (
              <span
                key={tier.id}
                aria-disabled="true"
                aria-current={current ? "page" : undefined}
                className={`${base} cursor-default text-muted ${current ? "bg-card shadow-sm" : ""}`}
              >
                {tier.name}
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em]">Soon</span>
              </span>
            );
          }
          return (
            <Link
              key={tier.id}
              href={`/${tier.id}`}
              aria-current={current ? "page" : undefined}
              className={`${base} ${current ? "" : "text-ink"}`}
              style={current ? { backgroundColor: colors.buttonBg, color: colors.buttonFg } : undefined}
            >
              {tier.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function Shell({ model, children }: { model: TierPageModel; children: ReactNode }) {
  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-14 max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-[15px] font-semibold tracking-tight text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Lifestyles
          </Link>
          <TierSwitcher tiers={model.tiers} currentId={model.tier.id} accent={model.tier.accent} />
        </div>
      </header>
      {children}
    </div>
  );
}

function CategoryGrid({
  model,
  onOpen,
}: {
  model: TierPageModel;
  onOpen: (id: string, trigger: HTMLButtonElement) => void;
}) {
  const colors = accentColors(model.tier.accent);
  return (
    <>
      <div className="border-b border-line" style={{ backgroundColor: colors.tint, boxShadow: `inset 3px 0 0 ${colors.raw}` }}>
        <div className="mx-auto max-w-[1440px] px-4 py-3 sm:px-6">
          <h1 className="text-[15px] font-medium tracking-tight text-ink">{model.summary}</h1>
        </div>
      </div>
      <div className="page-enter mx-auto max-w-[1440px] px-4 py-4 sm:px-6 xl:py-5">
        <p aria-hidden="true" className="mb-3 hidden gap-x-6 text-[11px] font-medium uppercase tracking-[0.18em] text-muted xl:flex">
          {model.groups.map((group) => (
            <span key={group.section}>{group.section}</span>
          ))}
        </p>
        <div className="grid grid-cols-2 items-stretch gap-2.5 md:grid-cols-4 xl:grid-cols-5 xl:gap-3">
          {model.groups.map((group) => (
            <Fragment key={group.section}>
              <h2 className="col-span-full mt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-muted first:mt-0 xl:sr-only">
                {group.section}
              </h2>
              {group.categories.map((category) => (
                <CategoryCard key={category.id} category={category} section={group.section} onOpen={onOpen} />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </>
  );
}

function ComingSoon({ model }: { model: TierPageModel }) {
  return (
    <main id="content" className="page-enter mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{model.tier.name} is coming soon</h1>
      <p className="mt-4 text-lg leading-7 text-muted">{model.tier.description}</p>
      {model.liveTiers.length > 0 ? (
        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
          {model.liveTiers.map((tier) => (
            <Link
              key={tier.id}
              href={`/${tier.id}`}
              className="inline-flex min-h-11 items-center text-sm font-medium underline decoration-line underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              See the {tier.name} kit
            </Link>
          ))}
        </div>
      ) : null}
    </main>
  );
}

function DeepLink({ onPick }: { onPick: (id: string | null) => void }) {
  const params = useSearchParams();
  const pick = params.get("pick");
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });
  useEffect(() => {
    onPickRef.current(pick);
  }, [pick]);
  return null;
}

export function TierPage({ model }: { model: TierPageModel }) {
  const router = useRouter();
  const pathname = usePathname();
  const openable = useMemo(() => readyIds(model.groups), [model.groups]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef<string | null>(null);
  const openedFromUi = useRef(false);

  const resolve = useCallback((id: string | null) => (id && openable.has(id) ? id : null), [openable]);

  const setPick = useCallback((id: string | null) => {
    activeIdRef.current = id;
    setActiveId(id);
  }, []);

  useEffect(() => {
    const previous = wasOpenRef.current;
    wasOpenRef.current = activeId;
    if (previous && !activeId) {
      const target = triggerRef.current ?? document.getElementById(`card-${previous}`);
      target?.focus();
      triggerRef.current = null;
    }
  }, [activeId]);

  const onQuery = useCallback(
    (id: string | null) => {
      const resolved = resolve(id);
      if (resolved) {
        triggerRef.current = triggerRef.current ?? document.getElementById(`card-${resolved}`);
      }
      setPick(resolved);
    },
    [resolve, setPick],
  );

  function writePickUrl(id: string | null) {
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("pick", id);
    else params.delete("pick");
    const search = params.toString();
    const href = search ? `${pathname}?${search}` : pathname;
    // Query-only update on the same route. scroll: false avoids a jump.
    if (id) {
      openedFromUi.current = true;
      router.push(href, { scroll: false });
      return;
    }
    if (openedFromUi.current) {
      openedFromUi.current = false;
      router.back();
      return;
    }
    router.replace(href, { scroll: false });
  }

  function openPick(id: string, trigger: HTMLButtonElement) {
    if (!openable.has(id)) return;
    triggerRef.current = trigger;
    setPick(id);
    if (new URLSearchParams(window.location.search).get("pick") === id) return;
    writePickUrl(id);
  }

  function closePick() {
    const current = activeIdRef.current;
    if (current && !triggerRef.current) {
      triggerRef.current = document.getElementById(`card-${current}`);
    }
    setPick(null);
    if (!new URLSearchParams(window.location.search).has("pick")) return;
    writePickUrl(null);
  }

  const activeCategory = model.groups
    .flatMap((group) => group.categories)
    .find((category) => category.id === activeId && category.pick);

  const comingSoon = model.tier.status !== "live";

  return (
    <>
      <Suspense fallback={null}>
        <DeepLink onPick={onQuery} />
      </Suspense>
      <div inert={activeId ? true : undefined}>
        <Shell model={model}>
          {comingSoon ? (
            <ComingSoon model={model} />
          ) : (
            <main id="content">
              <CategoryGrid model={model} onOpen={openPick} />
            </main>
          )}
        </Shell>
      </div>
      {activeCategory?.pick ? (
        <PickDrawer
          categoryName={activeCategory.name}
          pick={activeCategory.pick}
          accent={model.tier.accent}
          onClose={closePick}
        />
      ) : null}
    </>
  );
}
