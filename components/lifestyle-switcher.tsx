"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import type { Tier } from "@/lib/schema";
import { focusQuietly } from "@/lib/input-modality";

export type SwitcherLifestyle = Pick<Tier, "id" | "name" | "status" | "group">;

const segment =
  "switcher-segment inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 rounded-full px-2.5 text-[12px] leading-none tracking-[-0.01em] whitespace-nowrap transition-colors duration-[380ms] ease-catalog focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal min-[400px]:px-3 min-[400px]:text-[13px]";

/** "?cat=kitchen" while a category chip is active, so switching lifestyles keeps the filter. */
function useCatQuery(): string {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const read = () => {
      const cat = new URLSearchParams(window.location.search).get("cat");
      setQuery(cat && /^[a-z0-9-]+$/.test(cat) ? `?cat=${cat}` : "");
    };
    read();
    window.addEventListener("kit:view", read);
    window.addEventListener("popstate", read);
    return () => {
      window.removeEventListener("kit:view", read);
      window.removeEventListener("popstate", read);
    };
  }, []);
  return query;
}

function Segment({ lifestyle, current }: { lifestyle: SwitcherLifestyle; current: boolean }) {
  const query = useCatQuery();
  const className = `${segment} ${current ? "bg-ink text-white" : "text-ink"}`;
  return (
    <Link href={`/${lifestyle.id}${query}`} aria-current={current ? "page" : undefined} className={className}>
      {lifestyle.name}
      {current ? <span className="sr-only">, current page</span> : null}
    </Link>
  );
}

function MoreLifestyles({
  lifestyles,
  currentId,
}: {
  lifestyles: SwitcherLifestyle[];
  currentId: string;
}) {
  const [open, setOpen] = useState(false);
  const query = useCatQuery();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const menuId = useId();
  const active = lifestyles.find((lifestyle) => lifestyle.id === currentId) ?? null;

  useEffect(() => {
    if (!open) return;
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointer(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const current = menuRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    const first = menuRef.current?.querySelector<HTMLElement>("[data-menu-item]");
    focusQuietly(current ?? first);
  }, [open]);

  function onMenuKey(event: KeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[data-menu-item]") ?? [])];
    if (items.length === 0) return;
    event.preventDefault();
    const index = items.findIndex((item) => item === document.activeElement);
    let next = 0;
    if (event.key === "ArrowDown") next = index < 0 ? 0 : (index + 1) % items.length;
    else if (event.key === "ArrowUp") next = index <= 0 ? items.length - 1 : index - 1;
    else if (event.key === "End") next = items.length - 1;
    items[next]?.focus();
  }

  const itemClass =
    "flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[13px] leading-5 focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-[-2px] focus-visible:outline-signal";

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && (menuRef.current?.contains(next) || buttonRef.current?.contains(next))) return;
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-11 max-w-[7.25rem] min-w-11 items-center justify-center gap-1 rounded-full px-3 text-[12px] leading-none tracking-[-0.01em] transition-colors duration-[380ms] ease-catalog focus-visible:outline focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-signal min-[400px]:max-w-[9.5rem] min-[400px]:text-[13px] sm:max-w-[14rem] ${
          active ? "bg-ink text-white" : "bg-field text-ink"
        }`}
      >
        <span className="truncate">{active ? active.name : "More"}</span>
        {active ? <span className="sr-only">, current page</span> : <span className="sr-only"> lifestyles</span>}
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
          <path d="M2 4l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="More lifestyles"
          onKeyDown={onMenuKey}
          className="absolute right-0 top-[calc(100%+0.4rem)] z-40 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl bg-paper p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.08)] ring-1 ring-line"
        >
          {lifestyles.map((lifestyle) => {
            const current = lifestyle.id === currentId;
            const label = (
              <>
                <span className="min-w-0 truncate">{lifestyle.name}</span>
                {current ? <span className="sr-only">, current page</span> : null}
              </>
            );
            return (
              <li key={lifestyle.id} role="none">
                <Link
                  href={`/${lifestyle.id}${query}`}
                  role="menuitem"
                  aria-current={current ? "page" : undefined}
                  data-menu-item=""
                  className={`${itemClass} text-ink hover:bg-field`}
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

export function LifestyleSwitcher({
  lifestyles,
  currentId,
}: {
  lifestyles: SwitcherLifestyle[];
  currentId: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const primary = lifestyles.filter((lifestyle) => lifestyle.group !== "secondary");
  const secondary = lifestyles.filter((lifestyle) => lifestyle.group === "secondary");

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const left = el.scrollLeft > 2;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    const reveal = () => {
      const current = el.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current) return;
      const host = el.getBoundingClientRect();
      const item = current.getBoundingClientRect();
      if (item.left < host.left + 4) el.scrollLeft -= host.left + 4 - item.left;
      else if (item.right > host.right - 4) el.scrollLeft += item.right - (host.right - 4);
    };
    reveal();
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(() => {
      reveal();
      measure();
    });
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [primary.length, currentId]);

  function onScrollKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const scroller = scrollerRef.current;
    if (!scroller || !scroller.contains(event.target as Node)) return;
    event.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scroller.scrollBy({ left: event.key === "ArrowRight" ? 96 : -96, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="flex min-w-0 flex-1 items-center justify-end gap-1" onKeyDown={onScrollKey}>
      <div
        className="switcher-fade relative min-w-0 flex-1 overflow-hidden"
        data-left={edges.left ? "true" : "false"}
        data-right={edges.right ? "true" : "false"}
      >
        <div
          ref={scrollerRef}
          className="switcher-scroll w-full"
          tabIndex={0}
          role="region"
          aria-label="Primary lifestyles"
        >
          <div className="flex w-max min-w-full items-center justify-end">
          <div className="inline-flex rounded-full bg-field p-0.5">
            {primary.map((lifestyle) => (
              <Segment key={lifestyle.id} lifestyle={lifestyle} current={lifestyle.id === currentId} />
            ))}
          </div>
          </div>
        </div>
      </div>
      {secondary.length > 0 ? <MoreLifestyles lifestyles={secondary} currentId={currentId} /> : null}
    </div>
  );
}
