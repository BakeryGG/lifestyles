"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import {
  accentColors,
  displayText,
  formatPrice,
  isBuyableUrl,
  type PresentedPick,
  type ShownAlt,
  type ShownProduct,
} from "@/lib/present";
import { ProductImage } from "./product-image";
import { ReservedPlate } from "./reserved-plate";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

const DRAWER_SIZES = "(min-width: 1024px) 320px, (min-width: 600px) 42vw, 88vw";

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 opacity-90">
      <path
        d="M4 2.5h7.5V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M11.2 2.8 2.8 11.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BuyControl({
  product,
  colors,
  variant,
}: {
  product: ShownProduct | ShownAlt;
  colors: { buttonBg: string; buttonFg: string };
  variant: "solid" | "outline";
}) {
  const brand = displayText(product.brand);
  const name = displayText(product.name);
  const label = [brand, name].filter(Boolean).join(" ") || "this pick";
  if (!isBuyableUrl(product.url)) {
    return (
      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-well px-4 text-[15px] text-muted">
        Link coming
      </span>
    );
  }
  const className =
    variant === "solid"
      ? "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      : "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-transparent px-4 text-[15px] font-medium text-ink ring-1 ring-inset ring-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={variant === "solid" ? { backgroundColor: colors.buttonBg, color: colors.buttonFg } : undefined}
    >
      Buy
      <ExternalIcon />
      <span className="sr-only">
        {" "}
        {label} (opens in a new tab)
      </span>
    </a>
  );
}

function Column({
  product,
  categoryName,
  label,
  when,
  colors,
  variant,
}: {
  product: ShownProduct | ShownAlt;
  categoryName: string;
  label: string;
  when: string | null;
  colors: { buttonBg: string; buttonFg: string };
  variant: "solid" | "outline";
}) {
  const brand = displayText(product.brand);
  const name = displayText(product.name) ?? categoryName;
  const why = displayText(product.why);

  return (
    <article className="flex min-w-0 flex-col gap-2 min-[600px]:grid min-[600px]:grid-rows-subgrid min-[600px]:row-span-7 min-[600px]:gap-2">
      <div>
        <p className="text-[12px] font-medium leading-4 text-ink">{label}</p>
        {when ? <p className="mt-1 text-[13px] leading-5 text-pretty text-muted">{when}</p> : null}
      </div>
      <div className="relative h-32 w-full overflow-hidden rounded-lg bg-stage min-[600px]:h-auto min-[600px]:aspect-[4/3]">
        <ProductImage
          key={product.image}
          src={product.image}
          srcSet={product.srcSet}
          sizes={DRAWER_SIZES}
          className="absolute inset-0 h-full w-full object-contain p-2 min-[600px]:p-3"
        />
      </div>
      {brand ? (
        <p className="text-[12px] font-medium uppercase leading-4 tracking-[0.04em] text-muted">{brand}</p>
      ) : (
        <div aria-hidden="true" className="h-4" />
      )}
      <h2 className="text-lg font-semibold leading-6 tracking-tight break-words text-ink lg:text-xl">{name}</h2>
      <p className="text-[15px] leading-6 tabular-nums text-ink">{formatPrice(product.price, product.currency)}</p>
      {why ? (
        <p className="text-[15px] leading-6 text-pretty break-words text-muted">{why}</p>
      ) : (
        <div aria-hidden="true" />
      )}
      <div className="pt-2">
        <BuyControl product={product} colors={colors} variant={variant} />
      </div>
    </article>
  );
}

function EmptyComparison({
  tierName,
  categoryName,
  number,
}: {
  tierName: string;
  categoryName: string;
  number: number;
}) {
  return (
    <div>
      <p className="max-w-md text-[15px] leading-6 text-pretty text-muted">
        The {tierName} pick for {categoryName} is still being chosen.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        {(["Our pick", "Alternative"] as const).map((label) => (
          <div key={label} className="min-w-0">
            <p className="mb-2 text-[12px] font-medium leading-4 text-ink">{label}</p>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stage">
              <ReservedPlate number={number} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PickDrawer({
  categoryName,
  section,
  number,
  tierName,
  pick,
  accent,
  closing,
  onClose,
}: {
  categoryName: string;
  section: string;
  number: number;
  tierName: string;
  pick: PresentedPick | null;
  accent: string;
  closing: boolean;
  onClose: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const colors = accentColors(accent);
  const showAlt = pick?.alt != null;
  const when = pick?.alt ? displayText(pick.alt.when) : null;
  const canBuy =
    (!!pick && isBuyableUrl(pick.main.url)) || (!!pick?.alt && isBuyableUrl(pick.alt.url));
  const empty = pick == null;

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    closeRef.current?.focus({ preventScroll: true });

    function scrollByKey(key: string) {
      const scroller = scrollerRef.current;
      if (!scroller) return false;
      const page = Math.max(scroller.clientHeight - 32, 48);
      let next = scroller.scrollTop;
      if (key === "ArrowDown") next += 48;
      else if (key === "ArrowUp") next -= 48;
      else if (key === "PageDown") next += page;
      else if (key === "PageUp") next -= page;
      else if (key === "Home") next = 0;
      else if (key === "End") next = scroller.scrollHeight;
      else return false;
      const max = scroller.scrollHeight - scroller.clientHeight;
      next = Math.max(0, Math.min(max, next));
      if (next === scroller.scrollTop) return false;
      scroller.scrollTop = next;
      return true;
    }

    function items(): HTMLElement[] {
      const root = hostRef.current;
      if (!root) return [];
      return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
        if (element.getAttribute("aria-hidden") === "true") return false;
        return element.tabIndex !== -1;
      });
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "PageDown" ||
        event.key === "PageUp" ||
        event.key === "Home" ||
        event.key === "End"
      ) {
        const target = event.target;
        if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable='true']")) {
          return;
        }
        if (scrollByKey(event.key)) event.preventDefault();
        return;
      }
      if (event.key !== "Tab") return;
      const list = items();
      if (list.length === 0) {
        event.preventDefault();
        closeRef.current?.focus({ preventScroll: true });
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || !hostRef.current?.contains(active)) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
      } else if (active === last || !hostRef.current?.contains(active)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const panelPosition = empty
    ? "lg:top-0 lg:bottom-auto lg:h-auto lg:max-h-full"
    : "lg:inset-y-0 lg:h-full lg:max-h-none";

  return (
    <div ref={hostRef} data-pick-dialog="" className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-[rgba(28,28,26,0.45)] ${closing ? "motion-fade-exit" : "motion-fade"}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`pick-panel absolute inset-x-0 bottom-0 flex h-auto max-h-[85vh] flex-col rounded-t-2xl bg-card shadow-[0_-16px_48px_rgba(28,28,26,0.14)] lg:left-auto lg:right-0 lg:w-[min(44rem,calc(100vw-4rem))] lg:rounded-none lg:shadow-[-20px_0_48px_rgba(28,28,26,0.12)] ${panelPosition} ${closing ? "pick-panel-exit" : ""}`}
      >
        <div className="flex shrink-0 justify-center pt-2 lg:hidden" aria-hidden="true">
          <div className="h-1 w-8 rounded-full bg-line" />
        </div>
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 py-3 lg:px-8 lg:pt-6">
          <div className="min-w-0 pt-1">
            <p className="text-[12px] font-medium leading-4 text-muted">{section}</p>
            <h1 id={titleId} className="text-lg font-semibold leading-6 tracking-tight text-ink">
              {categoryName}
            </h1>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink ring-1 ring-inset ring-line hover:bg-well focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div
          ref={scrollerRef}
          tabIndex={canBuy ? -1 : 0}
          role={canBuy ? undefined : "region"}
          aria-label={canBuy ? undefined : "Pick details"}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink lg:px-8 lg:pb-8"
        >
          {pick == null ? (
            <EmptyComparison tierName={tierName} categoryName={categoryName} number={number} />
          ) : (
            <div
              className={
                showAlt
                  ? "flex flex-col gap-6 min-[600px]:grid min-[600px]:grid-cols-2 min-[600px]:grid-rows-[auto_auto_auto_auto_auto_auto_auto] min-[600px]:gap-x-4 min-[600px]:gap-y-0"
                  : "mx-auto flex w-full max-w-md flex-col"
              }
            >
              <Column
                product={pick.main}
                categoryName={categoryName}
                label="Our pick"
                when={null}
                colors={colors}
                variant="solid"
              />
              {showAlt && pick.alt ? (
                <Column
                  product={pick.alt}
                  categoryName={categoryName}
                  label="Alternative"
                  when={when}
                  colors={colors}
                  variant="outline"
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
