"use client";

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { PresentedPick } from "@/lib/present";
import { PickDrawer } from "./pick-drawer";

type DrawerCategory = {
  id: string;
  name: string;
  section: string;
  number: number;
  pick: PresentedPick | null;
};

const EXIT_MS = 160;

function hrefFor(pick: string | null): string {
  const params = new URLSearchParams(window.location.search);
  if (pick) params.set("pick", pick);
  else params.delete("pick");
  const search = params.toString();
  return search ? `${window.location.pathname}?${search}` : window.location.pathname;
}

function escapeId(id: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") return CSS.escape(id);
  return id.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function markVisibleCard(id: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`button[data-pick="${escapeId(id)}"]`));
  const visible = nodes.find((node) => node.getClientRects().length > 0) ?? null;
  for (const node of nodes) {
    if (node === visible) node.id = `card-${id}`;
    else node.removeAttribute("id");
  }
  return visible;
}

function markAllCards() {
  const ids = new Set<string>();
  document.querySelectorAll<HTMLElement>("button[data-pick]").forEach((node) => {
    if (node.dataset.pick) ids.add(node.dataset.pick);
  });
  ids.forEach((id) => markVisibleCard(id));
}

function DeepLink({ onPick }: { onPick: () => void }) {
  const params = useSearchParams();
  const pick = params.get("pick");
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onPickRef.current = onPick;
  });
  useEffect(() => {
    onPickRef.current();
  }, [pick]);
  return null;
}

export function PickController({
  live,
  tierName,
  accent,
  categories,
  children,
}: {
  live: boolean;
  tierName: string;
  accent: string;
  categories: DrawerCategory[];
  children: ReactNode;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [shownId, setShownId] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  const idsRef = useRef(new Set(categories.map((category) => category.id)));
  const liveRef = useRef(live);
  const activeRef = useRef<string | null>(null);
  const shownRef = useRef<string | null>(null);
  const pushedRef = useRef(false);
  const suppressRef = useRef<string | null>(null);
  const returnIdRef = useRef<string | null>(null);
  const wasShownRef = useRef<string | null>(null);
  const closingRef = useRef(false);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    idsRef.current = new Set(categories.map((category) => category.id));
    liveRef.current = live;
  }, [categories, live]);

  const clearExit = useCallback(() => {
    if (exitTimer.current != null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }, []);

  const reveal = useCallback(
    (id: string) => {
      clearExit();
      closingRef.current = false;
      returnIdRef.current = id;
      shownRef.current = id;
      activeRef.current = id;
      setShownId(id);
      setClosing(false);
      setActiveId(id);
    },
    [clearExit],
  );

  const conceal = useCallback(() => {
    activeRef.current = null;
    setActiveId(null);
    if (!shownRef.current) {
      setClosing(false);
      closingRef.current = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = null;
      closingRef.current = false;
      setShownId(null);
      setClosing(false);
      return;
    }
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    clearExit();
    exitTimer.current = window.setTimeout(() => {
      shownRef.current = null;
      closingRef.current = false;
      setShownId(null);
      setClosing(false);
      exitTimer.current = null;
    }, EXIT_MS);
  }, [clearExit]);

  const applyFromLocation = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const hasPick = params.has("pick");
    const raw = params.get("pick");
    const known = raw != null && raw.length > 0 && idsRef.current.has(raw);
    if (!liveRef.current || (hasPick && !known)) {
      if (hasPick) window.history.replaceState(null, "", hrefFor(null));
      suppressRef.current = null;
      conceal();
      return;
    }
    if (!raw) {
      suppressRef.current = null;
      conceal();
      return;
    }
    if (suppressRef.current === raw) return;
    suppressRef.current = null;
    reveal(raw);
  }, [conceal, reveal]);

  useLayoutEffect(() => {
    markAllCards();
  });

  useLayoutEffect(() => {
    if (!shownId) return;
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
    return () => {
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
  }, [shownId]);

  useLayoutEffect(() => {
    const previous = wasShownRef.current;
    wasShownRef.current = shownId;
    if (shownId || !previous) return;
    const id = returnIdRef.current;
    returnIdRef.current = null;
    if (!id) return;
    const card = markVisibleCard(id);
    if (!card) return;
    card.scrollIntoView({ block: "nearest", inline: "nearest" });
    card.focus({ preventScroll: true });
  }, [shownId]);

  useEffect(() => {
    if (!shownId) return;
    const skip = document.querySelector<HTMLElement>("[data-skip-link]");
    if (!skip || skip.hasAttribute("inert")) return;
    skip.setAttribute("inert", "");
    return () => {
      skip.removeAttribute("inert");
    };
  }, [shownId]);

  useEffect(() => {
    function onPop() {
      pushedRef.current = false;
      const raw = new URLSearchParams(window.location.search).get("pick");
      if (suppressRef.current && suppressRef.current !== raw) suppressRef.current = null;
      applyFromLocation();
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [applyFromLocation]);

  useEffect(() => {
    function onError(event: Event) {
      const img = event.target;
      if (!(img instanceof HTMLImageElement)) return;
      const fallback = img.dataset.fallback;
      if (!fallback || img.dataset.failed === "1") return;
      const current = img.getAttribute("src") ?? "";
      if (current === fallback) return;
      img.dataset.failed = "1";
      img.src = fallback;
    }
    window.addEventListener("error", onError, true);
    return () => window.removeEventListener("error", onError, true);
  }, []);

  useEffect(() => () => clearExit(), [clearExit]);

  useEffect(() => {
    function onResize() {
      markAllCards();
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function openPick(id: string) {
    if (!liveRef.current || !idsRef.current.has(id)) return;
    suppressRef.current = null;
    const current = new URLSearchParams(window.location.search).get("pick");
    reveal(id);
    if (current === id) return;
    if (current) {
      window.history.replaceState({ lifestylesPick: id }, "", hrefFor(id));
      return;
    }
    window.history.pushState({ lifestylesPick: id }, "", hrefFor(id));
    pushedRef.current = true;
  }

  function closePick() {
    const current = new URLSearchParams(window.location.search).get("pick");
    const id = activeRef.current;
    if (id && current) suppressRef.current = id;
    conceal();
    if (!current) {
      suppressRef.current = null;
      return;
    }
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
      return;
    }
    window.history.replaceState(null, "", hrefFor(null));
  }

  function onClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("button[data-pick]");
    if (!(button instanceof HTMLButtonElement)) return;
    const id = button.dataset.pick;
    if (!id) return;
    openPick(id);
  }

  const shown = categories.find((category) => category.id === shownId) ?? null;

  return (
    <>
      <Suspense fallback={null}>
        <DeepLink onPick={applyFromLocation} />
      </Suspense>
      <div inert={shownId ? true : undefined} onClick={onClick}>
        {children}
      </div>
      {shown ? (
        <PickDrawer
          key={shown.id}
          categoryName={shown.name}
          section={shown.section}
          number={shown.number}
          tierName={tierName}
          pick={shown.pick}
          accent={accent}
          closing={closing && activeId == null}
          onClose={closePick}
        />
      ) : null}
    </>
  );
}
