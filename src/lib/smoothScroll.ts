import type Lenis from "lenis";

/** The page's smooth-scroll instance, when one is running (desktop, motion allowed). */
let instance: Lenis | null = null;

export function setSmoothScroller(lenis: Lenis | null) {
  instance = lenis;
}

export function isSmoothScrolling(): boolean {
  return instance !== null;
}

/** Scroll the page to `y`, gliding with the smooth scroller when it is running. */
export function smoothScrollTo(y: number) {
  if (instance) instance.scrollTo(y, { duration: 1.6 });
  else window.scrollTo({ top: y, behavior: "smooth" });
}
