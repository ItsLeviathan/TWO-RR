"use client";

import { useEffect, useRef, useSyncExternalStore, type RefObject } from "react";
import { isSmoothScrolling, smoothScrollTo } from "@/lib/smoothScroll";

/**
 * - "scroll": motion allowed → the story is pinned and scroll drives photos and chapters.
 * - "static": prefers-reduced-motion → normal stacked sections, no pinning, no animation.
 */
export type StoryMode = "scroll" | "static";

function computeMode(): StoryMode {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "static" : "scroll";
}

function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function useStoryMode(): StoryMode {
  // Server render assumes motion is allowed; CSS media queries keep the server HTML correct for
  // reduced-motion visitors until hydration.
  return useSyncExternalStore(subscribeMotion, computeMode, () => "scroll");
}

/** Pins the story while it scrolls past and reports smoothed progress (0 → 1) every frame it changes. */
export function useScrollStory({
  storyRef,
  onProgress,
}: {
  storyRef: RefObject<HTMLElement | null>;
  onProgress?: (progress: number) => void;
}) {
  const mode = useStoryMode();
  const onProgressRef = useRef(onProgress);
  useEffect(() => {
    onProgressRef.current = onProgress;
  });

  // Geometry of the pinned story, shared by the loop and scrollToProgress.
  const geom = useRef({ start: 0, distance: 1, headerH: 0 });

  // Scroll → progress loop. Runs only while the story is on screen and the tab is visible,
  // and sleeps once progress has settled.
  useEffect(() => {
    if (mode === "static") return;
    const story = storyRef.current;
    if (!story) return;
    const stage = story.firstElementChild as HTMLElement;

    const measure = () => {
      const headerH = parseFloat(getComputedStyle(stage).top) || 0;
      const top = story.getBoundingClientRect().top + window.scrollY;
      geom.current = { start: top - headerH, distance: Math.max(1, story.offsetHeight - stage.offsetHeight), headerH };
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(story);
    window.addEventListener("resize", measure);

    let smoothed = -1;
    let raf = 0;
    let last = performance.now();
    let visible = true;
    const target = () => Math.min(1, Math.max(0, (window.scrollY - geom.current.start) / geom.current.distance));

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const t = target();
      // Ease towards the scroll position. With smooth scrolling the page already glides, so a
      // lighter touch avoids feeling sluggish; with native (touch) scrolling, more easing smooths it.
      const rate = isSmoothScrolling() ? 12 : 8;
      smoothed = smoothed < 0 ? t : smoothed + (t - smoothed) * (1 - Math.exp(-dt * rate));
      const settled = Math.abs(t - smoothed) < 0.00005;
      if (settled) smoothed = t;
      onProgressRef.current?.(smoothed);
      if (!settled) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && visible && document.visibilityState === "visible") {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) wake();
      else stop();
    });
    io.observe(story);
    const onVisibility = () => (document.visibilityState === "visible" ? wake() : stop());
    window.addEventListener("resize", wake);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("scroll", wake, { passive: true });
    wake();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", wake);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, storyRef]);

  function scrollToProgress(p: number) {
    const { start, distance, headerH } = geom.current;
    const story = storyRef.current;
    // p > 1 means "past the story" (Skip intro).
    const y = p > 1 && story ? story.getBoundingClientRect().top + window.scrollY + story.offsetHeight - headerH : start + p * distance;
    smoothScrollTo(Math.max(0, y));
  }

  return { mode, scrollToProgress };
}
