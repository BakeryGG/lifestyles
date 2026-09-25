"use client";

import { useEffect } from "react";

/**
 * Category chips and "Only picked": swaps data attributes on #kit and keeps ?cat / ?picked in the URL.
 * The grid is server HTML; this island only toggles attributes.
 */
export function KitFilter() {
  useEffect(() => {
    const root = document.getElementById("kit");
    if (!root) return;
    const defaultView = root.dataset.defaultView ?? "all";
    const chips = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[data-chip]"));
    const known = new Set(chips.map((chip) => chip.dataset.chip ?? ""));
    const toggle = root.querySelector<HTMLButtonElement>("button[data-picked-toggle]");
    const emptyNote = root.querySelector<HTMLElement>("[data-picked-empty]");

    const pickedIn = (view: string) =>
      Number(chips.find((chip) => chip.dataset.chip === view)?.dataset.pickedCount ?? "0");

    function writeUrl(view: string, picked: boolean, push: boolean) {
      const params = new URLSearchParams(window.location.search);
      if (view === defaultView) params.delete("cat");
      else params.set("cat", view);
      if (picked) params.set("picked", "1");
      else params.delete("picked");
      const search = params.toString();
      const href = search ? `${window.location.pathname}?${search}` : window.location.pathname;
      if (push) window.history.pushState(window.history.state, "", href);
      else window.history.replaceState(window.history.state, "", href);
      window.dispatchEvent(new Event("kit:view"));
    }

    function apply(view: string, pickedWanted: boolean) {
      const r = root!;
      r.dataset.view = view;
      const available = pickedIn(view) > 0;
      const picked = pickedWanted && available;
      if (picked) r.dataset.picked = "1";
      else delete r.dataset.picked;
      for (const chip of chips) {
        if (chip.dataset.chip === view) chip.setAttribute("aria-current", "true");
        else chip.removeAttribute("aria-current");
      }
      if (toggle) {
        toggle.setAttribute("aria-pressed", picked ? "true" : "false");
        toggle.disabled = !available;
        toggle.title = available ? "" : "Nothing picked in this view yet";
      }
      if (emptyNote) emptyNote.hidden = !(pickedWanted && !available);
      return picked;
    }

    function fromUrl() {
      const params = new URLSearchParams(window.location.search);
      const cat = params.get("cat");
      const view = cat && known.has(cat) ? cat : defaultView;
      const picked = apply(view, params.get("picked") === "1");
      if ((cat && !known.has(cat)) || cat === defaultView || (params.get("picked") === "1" && !picked)) {
        writeUrl(view, picked, false);
      }
    }

    fromUrl();

    const onChip = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const chip = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-chip]");
      if (!chip || !root.contains(chip)) return;
      event.preventDefault();
      const view = chip.dataset.chip ?? defaultView;
      const picked = apply(view, root.dataset.picked === "1");
      writeUrl(view, picked, true);
      chip.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    const onToggle = () => {
      const view = root.dataset.view ?? defaultView;
      const picked = apply(view, root.dataset.picked !== "1");
      writeUrl(view, picked, false);
    };

    root.addEventListener("click", onChip);
    toggle?.addEventListener("click", onToggle);
    window.addEventListener("popstate", fromUrl);
    return () => {
      root.removeEventListener("click", onChip);
      toggle?.removeEventListener("click", onToggle);
      window.removeEventListener("popstate", fromUrl);
    };
  }, []);
  return null;
}
