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
  const alt = [brand, name].filter(Boolean).join(" ") || "Product";
  const buyable = isBuyableUrl(product.url);

  return (
    <div className="flex min-w-0 flex-col">
      {reserveKicker ? (
        <p
          className="mb-3 min-h-8 text-[12px] font-medium uppercase leading-4 tracking-[0.14em] text-muted"
          aria-hidden={kicker ? undefined : true}
        >
          {kicker ?? ""}
        </p>
      ) : null}
      <div className="aspect-[4/3] overflow-hidden rounded-lg bg-well">
        <ProductImage src={product.image} alt={alt} />
      </div>
      {brand ? (
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-muted">{brand}</p>
      ) : null}
      {name ? <h3 className="mt-1 text-xl font-medium tracking-tight text-ink">{name}</h3> : null}
      <p className="mt-2 text-[15px] tabular-nums text-ink">{formatPrice(product.price, product.currency)}</p>
      {why ? <p className="mt-2 text-[15px] leading-6 text-muted">{why}</p> : null}
      <div className="mt-5">
        {buyable ? (
          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 text-[15px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            style={{ backgroundColor: colors.buttonBg, color: colors.buttonFg }}
          >
            Buy
            {name ? <span className="sr-only"> {name}</span> : null}
          </a>
        ) : (
          <span className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-well px-4 text-[15px] text-muted">
            Link coming
          </span>
        )}
      </div>
    </div>
  );
}

export function PickDrawer({
  categoryName,
  pick,
  accent,
  onClose,
}: {
  categoryName: string;
  pick: PresentedPick;
  accent: string;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const colors = accentColors(accent);
  const showAlt = pick.alt != null;
  const when = pick.alt ? (displayText(pick.alt.when) ?? "Alternative") : null;

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const html = document.documentElement;
    const previousHtml = html.style.overflow;
    const previousBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    panel.focus();

    function items(): HTMLElement[] {
      if (!panel) return [];
      return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((element) => {
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
      if (event.key !== "Tab") return;
      const list = items();
      if (list.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === panel || !panel?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      html.style.overflow = previousHtml;
      document.body.style.overflow = previousBody;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50">
      <div className="motion-fade absolute inset-0 bg-[rgba(28,28,26,0.45)]" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="pick-panel absolute inset-x-0 bottom-0 flex max-h-[min(92vh,100%)] flex-col overflow-y-auto overscroll-contain rounded-t-2xl bg-card pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-16px_48px_rgba(28,28,26,0.14)] outline-none md:inset-y-0 md:left-auto md:right-0 md:h-full md:max-h-none md:w-[min(42rem,100%)] md:rounded-none md:pb-0 md:shadow-[-20px_0_48px_rgba(28,28,26,0.12)]"
      >
        <div className="flex justify-center pt-2.5 md:hidden" aria-hidden="true">
          <div className="h-1 w-9 rounded-full bg-line" />
        </div>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-card/95 px-5 py-3 backdrop-blur md:px-8 md:pt-6">
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-ink">
            {categoryName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink hover:bg-well focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className={`grid gap-8 px-5 pb-6 md:px-8 md:pb-10 ${showAlt ? "md:grid-cols-2" : "mx-auto w-full max-w-md"}`}>
          <Column product={pick.main} kicker={null} reserveKicker={showAlt} colors={colors} />
          {showAlt && pick.alt ? (
            <Column product={pick.alt} kicker={when} reserveKicker colors={colors} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
