"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { PresentedPick } from "@/lib/present";
import { PickDrawer } from "./pick-drawer";

type DrawerCategory = {
  id: string;
  name: string;
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
  const triggerRef = useRef<HTMLElement | null>(null);
  const pushedRef = useRef(false);
  const suppressRef = useRef<string | null>(null);
  const wasOpenRef = useRef<string | null>(null);
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
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = null;
      setShownId(null);
      setClosing(false);
      return;
    }
    setClosing(true);
    clearExit();
    exitTimer.current = window.setTimeout(() => {
      shownRef.current = null;
      setShownId(null);
      setClosing(false);
      exitTimer.current = null;
    }, EXIT_MS);
  }, [clearExit]);

  const applyFromLocation = useCallback(() => {
    const raw = new URLSearchParams(window.location.search).get("pick");
    const known = raw != null && idsRef.current.has(raw);
    if (!liveRef.current || (raw != null && !known)) {
      if (raw) window.history.replaceState(null, "", hrefFor(null));
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
    triggerRef.current = triggerRef.current ?? document.getElementById(`card-${raw}`);
    reveal(raw);
  }, [conceal, reveal]);

  useEffect(() => {
    const previous = wasOpenRef.current;
    wasOpenRef.current = activeId;
    if (previous && !activeId) {
      const target = triggerRef.current ?? document.getElementById(`card-${previous}`);
      target?.focus({ preventScroll: true });
      triggerRef.current = null;
    }
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    const skip = document.querySelector<HTMLElement>("[data-skip-link]");
    if (!skip || skip.hasAttribute("inert")) return;
    skip.setAttribute("inert", "");
    return () => {
      skip.removeAttribute("inert");
    };
  }, [activeId]);

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

  function openPick(id: string, trigger: HTMLElement) {
    if (!liveRef.current || !idsRef.current.has(id)) return;
    suppressRef.current = null;
    triggerRef.current = trigger;
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
    openPick(id, button);
  }

  const shown = categories.find((category) => category.id === shownId) ?? null;

  return (
    <>
      <Suspense fallback={null}>
        <DeepLink onPick={applyFromLocation} />
      </Suspense>
      <div inert={activeId ? true : undefined} onClick={onClick}>
        {children}
      </div>
      {shown ? (
        <PickDrawer
          key={shown.id}
          categoryName={shown.name}
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
