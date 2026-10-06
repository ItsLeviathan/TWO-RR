"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { setSmoothScroller } from "@/lib/smoothScroll";

/**
 * Inertial smooth scrolling for mouse wheels and trackpads on the public site. Touch devices
 * keep their native (already smooth) scrolling, and it never runs for visitors who prefer
 * reduced motion. Native scroll stays the source of truth, so keyboard, anchors, find-in-page
 * and assistive tech keep working; nested scroll areas (the cart drawer, dialogs) scroll normally,
 * and it pauses itself while a dialog locks the page.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.085,
      wheelMultiplier: 0.95,
      anchors: true,
      allowNestedScroll: true,
      autoToggle: true,
      stopInertiaOnNavigate: true,
    });
    setSmoothScroller(lenis);
    return () => {
      setSmoothScroller(null);
      lenis.destroy();
    };
  }, []);
  return null;
}
