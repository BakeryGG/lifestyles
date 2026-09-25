"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/** Focusable horizontal scroller. Arrow keys move it when the region itself is focused. */
export function HScroll({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const key = event.key;
    if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "Home" && key !== "End") return;
    const el = event.currentTarget;
    event.preventDefault();
    const step = Math.max(el.clientWidth * 0.7, 140);
    if (key === "Home") el.scrollTo({ left: 0 });
    else if (key === "End") el.scrollTo({ left: el.scrollWidth });
    else el.scrollBy({ left: key === "ArrowRight" ? step : -step });
  }, []);

  return (
    <div className="relative max-w-full">
      <div ref={ref} role="region" aria-label={label} tabIndex={0} className={className} onKeyDown={onKeyDown}>
        {children}
      </div>
      {more ? <div className="compare-more" aria-hidden="true" /> : null}
    </div>
  );
}
