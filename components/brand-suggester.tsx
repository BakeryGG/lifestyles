"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { parseBrandParam, suggestOutcome, type SuggestChip, type SuggestOutcome, type SuggestTierRef } from "@/lib/present";

function Result({ outcome }: { outcome: SuggestOutcome }) {
  if (outcome.kind === "empty") {
    return <span className="text-muted">Your closest lifestyle shows up here.</span>;
  }
  if (outcome.kind === "match") {
    return (
      <>
        You shop like{" "}
        <Link
          href={`/${outcome.tier.id}`}
          className="text-signal underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
        >
          {outcome.tier.name}
          <span aria-hidden="true"> →</span>
        </Link>
      </>
    );
  }
  if (outcome.kind === "soon") {
    return (
      <>
        <span className="text-signal">{outcome.tier.name}</span> is coming soon
        {outcome.fallback ? (
          <>
            {" — see "}
            <Link
              href={`/${outcome.fallback.id}`}
              className="text-signal underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {outcome.fallback.name}
            </Link>{" "}
            for now
          </>
        ) : (
          "."
        )}
      </>
    );
  }
  const allSoon = outcome.tiers.every((tier) => tier.status !== "live");
  return (
    <>
      You shop like{" "}
      {outcome.tiers.map((tier, index) => (
        <span key={tier.id}>
          {index > 0 ? (index === outcome.tiers.length - 1 ? " and " : ", ") : null}
          {tier.status === "live" ? (
            <Link
              href={`/${tier.id}`}
              className="text-signal underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
            >
              {tier.name}
            </Link>
          ) : (
            <span className="text-signal">{tier.name}</span>
          )}
        </span>
      ))}
      {allSoon && outcome.fallback ? (
        <>
          {" — see "}
          <Link
            href={`/${outcome.fallback.id}`}
            className="text-signal underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            {outcome.fallback.name}
          </Link>{" "}
          for now
        </>
      ) : null}
    </>
  );
}

export function BrandSuggester({ chips, tiers }: { chips: SuggestChip[]; tiers: SuggestTierRef[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => {
      const known = new Set(chips.map((chip) => chip.slug));
      setSelected(parseBrandParam(new URLSearchParams(window.location.search).get("brands")).filter((slug) => known.has(slug)));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [chips]);

  const write = useCallback(
    (next: string[]) => {
      const wanted = new Set(next);
      const ordered = chips.map((chip) => chip.slug).filter((slug) => wanted.has(slug));
      setSelected(ordered);
      const params = new URLSearchParams(window.location.search);
      if (ordered.length === 0) params.delete("brands");
      else params.set("brands", ordered.join(","));
      const search = params.toString();
      const href = search ? `${window.location.pathname}?${search}` : window.location.pathname;
      window.history.replaceState(null, "", href);
    },
    [chips],
  );

  function toggle(slug: string) {
    write(selected.includes(slug) ? selected.filter((item) => item !== slug) : [...selected, slug]);
  }

  const outcome = suggestOutcome(tiers, chips, selected);

  return (
    <section className="mt-16 sm:mt-24">
      <h2 className="text-[1.75rem] leading-none font-normal tracking-[-0.02em] text-ink">Not sure?</h2>
      <p className="mt-3 max-w-md text-[15px] leading-6 text-muted">Tap the brands you already buy.</p>
      <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Brands you already buy">
        {chips.map((chip) => {
          const on = selected.includes(chip.slug);
          return (
            <button
              key={chip.slug}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(chip.slug)}
              className={`inline-flex min-h-11 items-center rounded-full px-4 text-[13px] leading-none transition-colors duration-[380ms] ease-catalog focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal ${
                on ? "bg-ink text-white" : "bg-paper text-ink ring-1 ring-inset ring-line hover:bg-field"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
      <p className="mt-6 min-h-11 text-[15px] leading-6 text-ink" aria-live="polite" aria-atomic="true">
        <Result outcome={outcome} />
      </p>
      <noscript>
        <p className="mt-4 text-[13px] leading-6 text-muted">
          Brand matching runs in the browser. You can still open a lifestyle above.
        </p>
      </noscript>
    </section>
  );
}
