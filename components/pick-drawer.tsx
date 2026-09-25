"use client";

import { useEffect, useId, useRef } from "react";
import {
  accentColors,
  displayText,
  formatPrice,
  isBuyableUrl,
  type PresentedPick,
} from "@/lib/present";
import type { Product } from "@/lib/schema";
import { ProductImage } from "./product-image";

const FOCUSABLE =
  "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

const kickerClass = "text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-muted";

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
}: {
  product: Product;
  colors: { buttonBg: string; buttonFg: string };
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
  return (
    <a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      style={{ backgroundColor: colors.buttonBg, color: colors.buttonFg }}
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
  kicker,
  reserveKicker,
  colors,
}: {
  product: Product;
  kicker: string | null;
  reserveKicker: boolean;
  colors: { buttonBg: string; buttonFg: string };
}) {
  const brand = displayText(product.brand);
  const name = displayText(product.name);
  const why = displayText(product.why);

  return (
    <div className="flex min-w-0 flex-col">
      {reserveKicker ? (
        <p className="mb-3 line-clamp-2 min-h-10 text-[13px] leading-5 text-muted">{kicker ?? "\u00a0"}</p>
      ) : null}
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stage">
        <ProductImage
          key={product.image}
          src={product.image}
          sizes="(min-width: 1024px) 20vw, 92vw"
          className="absolute inset-0 h-full w-full object-contain p-3"
        />
      </div>
      <p className={`mt-4 h-4 truncate ${kickerClass}`}>{brand ?? "\u00a0"}</p>
      <h2 className="mt-1 line-clamp-2 min-h-14 text-xl font-medium tracking-tight text-ink">{name ?? "\u00a0"}</h2>
      <p className="mt-2 h-6 text-[15px] tabular-nums text-ink">{formatPrice(product.price, product.currency)}</p>
      <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-[15px] leading-6 text-muted">{why ?? "\u00a0"}</p>
      <div className="mt-auto pt-5">
        <BuyControl product={product} colors={colors} />
      </div>
    </div>
  );
}

export function PickDrawer({
  categoryName,
  tierName,
  pick,
  accent,
  closing,
  onClose,
}: {
  categoryName: string;
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

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    const scrollbar = window.innerWidth - html.clientWidth;
    const previous = {
      htmlOverflow: html.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      overscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.paddingRight = `${scrollbar}px`;
    body.style.overscrollBehavior = "none";
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
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      html.style.overflow = previous.htmlOverflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.paddingRight = previous.paddingRight;
      body.style.overscrollBehavior = previous.overscroll;
      window.scrollTo(0, scrollY);
    };
  }, []);

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
        className={`pick-panel absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,100%)] flex-col rounded-t-2xl bg-card shadow-[0_-16px_48px_rgba(28,28,26,0.14)] lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:max-h-none lg:w-[min(40rem,42vw)] lg:rounded-none lg:shadow-[-20px_0_48px_rgba(28,28,26,0.12)] ${closing ? "pick-panel-exit" : ""}`}
      >
        <div className="flex shrink-0 justify-center pt-2.5 lg:hidden" aria-hidden="true">
          <div className="h-1 w-9 rounded-full bg-line" />
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-3 lg:px-8 lg:pt-6">
          <h1 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
            {categoryName}
          </h1>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-well focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div
          ref={scrollerRef}
          tabIndex={0}
          aria-label="Pick details"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink lg:px-8 lg:pb-10"
        >
          {pick == null ? (
            <p className="max-w-sm pt-2 text-[17px] leading-7 text-muted">
              The {tierName} pick for {categoryName} is still being chosen.
            </p>
          ) : (
            <div className={`grid gap-8 ${showAlt ? "lg:grid-cols-2" : "mx-auto w-full max-w-md"}`}>
              <Column product={pick.main} kicker={null} reserveKicker={showAlt} colors={colors} />
              {showAlt && pick.alt ? (
                <Column product={pick.alt} kicker={when} reserveKicker colors={colors} />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
