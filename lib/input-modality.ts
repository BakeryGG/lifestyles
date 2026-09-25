/** Last input type, so programmatic focus shows a ring only for keyboard users. */
let last: "pointer" | "keyboard" = "pointer";

if (typeof window !== "undefined") {
  window.addEventListener("keydown", (event) => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) last = "keyboard";
  }, true);
  window.addEventListener("pointerdown", () => {
    last = "pointer";
  }, true);
}

export function focusQuietly(element: HTMLElement | null | undefined): void {
  element?.focus({ preventScroll: true, focusVisible: last === "keyboard" } as FocusOptions);
}
