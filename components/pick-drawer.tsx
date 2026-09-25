"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import {
  displayText,
  formatPrice,
  isBuyableUrl,
  type PresentedPick,
  type ShownAlt,
  type ShownProduct,
} from "@/lib/present";
import { focusQuietly } from "@/lib/input-modality";
import { EmptyPlate } from "./empty-plate";
import { ProductImage } from "./product-image";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

const DRAWER_SIZES =
  "(min-width: 1024px) 272px, (min-width: 600px) 448px, calc(100vw - 40px)";

function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
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

function BuyControl({ product }: { product: ShownProduct | ShownAlt }) {
  const brand = displayText(product.brand);
  const name = displayText(product.name);
  const label = [brand, name].filter(Boolean).join(" ") || "this pick";
  if (!isBuyableUrl(product.url)) {
    return (
      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-field text-[14px] text-muted">
        Link coming
      </span>
    );
  }
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-ink px-4 text-[14px] text-white focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
    >
      Buy
      <ExternalIcon />
      <span className="sr-only"> {label} (opens in new tab)</span>
    </a>
  );
}

function Column({
  product,
  categoryName,
  label,
  when,
  tone,
}: {
  product: ShownProduct | ShownAlt;
  categoryName: string;
  label: string;
  when: string | null;
  tone: "signal" | "muted";
}) {
  const brand = displayText(product.brand);
  const name = displayText(product.name) ?? categoryName;
  const why = displayText(product.why);

  return (
    <article className="flex min-w-0 flex-col gap-3">
      <div>
        <p className={`text-[12px] leading-4 ${tone === "signal" ? "text-signal" : "text-muted"}`}>{label}</p>
        {when ? <p className="mt-1 text-[13px] leading-5 text-muted">{when}</p> : null}
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-field lg:w-[17rem]">
          <ProductImage
            key={product.image}
            src={product.image}
            srcSet={product.srcSet}
            sizes={DRAWER_SIZES}
            className="absolute inset-0 h-full w-full object-contain p-6"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {brand ? <p className="text-[12px] leading-4 break-words text-muted">{brand}</p> : null}
          <h2 className="text-[1.125rem] leading-6 font-normal tracking-[-0.02em] break-words text-ink">{name}</h2>
          <p className="font-mono text-[13px] text-ink">{formatPrice(product.price, product.currency)}</p>
          {why ? <p className="text-[14px] leading-5 text-pretty break-words text-muted">{why}</p> : null}
          <div className="mt-1">
            <BuyControl product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}

const THUMB_SIZES = "80px";

/** "If you want a thicker tee" -> "Pick this if you want a thicker tee". */
function pickThisIf(when: string | null): string | null {
  if (!when) return null;
  const rest = when.replace(/^if\s+/i, "");
  return `Pick this if ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
}

function AltRow({ product, categoryName }: { product: ShownAlt; categoryName: string }) {
  const brand = displayText(product.brand);
  const name = displayText(product.name) ?? categoryName;
  const when = pickThisIf(displayText(product.when));
  const label = [brand, name].filter(Boolean).join(" ") || "this alternative";
  return (
    <li className="flex gap-4 py-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-field">
        <ProductImage
          key={product.image}
          src={product.image}
          srcSet={product.srcSet}
          sizes={THUMB_SIZES}
          className="absolute inset-0 h-full w-full object-contain p-2"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-[12px] leading-4 break-words text-muted">{brand ?? ""}</p>
          <p className="shrink-0 font-mono text-[13px] leading-5 text-ink">{formatPrice(product.price, product.currency)}</p>
        </div>
        <h3 className="text-[15px] leading-5 font-normal break-words text-ink">{name}</h3>
        {when ? <p className="text-[13px] leading-5 text-pretty break-words text-muted">{when}</p> : null}
        {isBuyableUrl(product.url) ? (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 self-start text-[13px] text-ink underline decoration-line underline-offset-4 hover:decoration-ink focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal"
          >
            Buy
            <ExternalIcon />
            <span className="sr-only"> {label} (opens in new tab)</span>
          </a>
        ) : (
          <span className="mt-1 inline-flex min-h-11 items-center text-[13px] text-muted">Link coming</span>
        )}
      </div>
    </li>
  );
}

function EmptyComparison({ tierName, categoryName }: { tierName: string; categoryName: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 lg:mx-0 lg:max-w-none lg:flex-row lg:items-start lg:gap-6">
      <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl lg:w-[17rem]">
        <EmptyPlate />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[12px] leading-4 text-muted">Pick coming</p>
        <p className="max-w-md text-[14px] leading-5 text-pretty text-muted">
          The {tierName} pick for {categoryName} is still being chosen.
        </p>
      </div>
    </div>
  );
}

export function PickDrawer({
  categoryName,
  section,
  tierName,
  pick,
  inheritedFromName,
  closing,
  onClose,
}: {
  categoryName: string;
  section: string;
  number: number;
  tierName: string;
  pick: PresentedPick | null;
  inheritedFromName?: string | null;
  accent: string;
  closing: boolean;
  onClose: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const alts = pick?.alts ?? [];
  const canBuy = (!!pick && isBuyableUrl(pick.main.url)) || alts.some((alt) => isBuyableUrl(alt.url));

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useLayoutEffect(() => {
    focusQuietly(closeRef.current);

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
        focusQuietly(closeRef.current);
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

  const panelPosition = "lg:inset-y-0 lg:h-full lg:max-h-none";

  return (
    <div ref={hostRef} data-pick-dialog="" className="fixed inset-0 z-50">
      <div
        className={`absolute inset-0 bg-ink/40 ${closing ? "motion-fade-exit" : "motion-fade"}`}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`pick-panel absolute inset-x-0 bottom-0 flex h-auto max-h-[85vh] flex-col rounded-t-2xl bg-paper lg:left-auto lg:right-0 lg:w-[min(44rem,calc(100vw-4rem))] lg:rounded-none lg:border-l lg:border-line ${panelPosition} ${closing ? "pick-panel-exit" : ""}`}
      >
        <div className="flex shrink-0 justify-center pt-2 lg:hidden" aria-hidden="true">
          <div className="h-1 w-8 rounded-full bg-line" />
        </div>
        <div className="flex shrink-0 items-start justify-between gap-4 px-5 py-3 lg:px-8 lg:pt-6">
          <div className="min-w-0 pt-1">
            <p className="text-[12px] leading-4 text-muted">{section}</p>
            <h1 id={titleId} className="text-[1.25rem] leading-7 font-normal tracking-[-0.02em] text-ink">
              {categoryName}
            </h1>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-field text-ink focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-ink"
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
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-[-2px] focus-visible:outline-signal lg:px-8 lg:pb-8"
        >
          {pick == null ? (
            <EmptyComparison tierName={tierName} categoryName={categoryName} />
          ) : (
            <div className="mx-auto flex w-full max-w-md flex-col gap-8 lg:max-w-none">
              {inheritedFromName ? (
                <p className="-mb-4 text-[13px] leading-5 text-muted">Same as {inheritedFromName}</p>
              ) : null}
              <div className="flex flex-col">
                <Column product={pick.main} categoryName={categoryName} label="Our pick" when={null} tone="signal" />
              </div>
              {alts.length > 0 ? (
                <section aria-labelledby={`${titleId}-alts`} className="border-t border-line pt-6">
                  <h2 id={`${titleId}-alts`} className="text-[13px] leading-5 tracking-[0.01em] text-muted">
                    Alternatives
                  </h2>
                  <ul className="mt-3 flex flex-col divide-y divide-line">
                    {alts.map((alt, index) => (
                      <AltRow key={`${alt.brand}-${alt.name}-${index}`} product={alt} categoryName={categoryName} />
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
