"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import type { CafeScene } from "./scene/createCafeScene";
import type { CameraKey } from "./story";

/**
 * - "3d":     motion allowed + WebGL available → scroll-driven 3D café.
 * - "scroll": motion allowed, no WebGL (or data-saver) → same scroll story over the static poster.
 * - "static": prefers-reduced-motion → normal stacked sections, no pinning, no animation.
 */
export type StoryMode = "3d" | "scroll" | "static";

const DEFAULT_LOGO = "/brand/two-rr-logo-640.webp";

let webglSupport: boolean | null = null;
function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const c = document.createElement("canvas");
    webglSupport = Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function computeMode(): StoryMode {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return "scroll";
  return hasWebGL() ? "3d" : "scroll";
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

function cssFont(variable: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

export function useScrollScene({
  storyRef,
  canvasRef,
  path,
  sceneOptions,
  onProgress,
}: {
  storyRef: RefObject<HTMLElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  path: CameraKey[];
  sceneOptions: { logoUrl: string | null; boardTitle: string; boardItems: { name: string; price: string }[] };
  onProgress?: (progress: number) => void;
}) {
  const mode = useStoryMode();
  const [sceneReady, setSceneReady] = useState(false);
  const sceneRef = useRef<CafeScene | null>(null);
  const onProgressRef = useRef(onProgress);
  const optionsRef = useRef({ path, sceneOptions });
  useEffect(() => {
    onProgressRef.current = onProgress;
    optionsRef.current = { path, sceneOptions };
  });

  // Geometry of the pinned story, shared by the loop and scrollToProgress.
  const geom = useRef({ start: 0, distance: 1, headerH: 0 });

  // Scroll → progress loop. Runs only while the story is on screen and the tab is visible.
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
    let frameCount = 0;
    // Adaptive quality: sample frame times and step quality down on slow devices.
    let sampleStart = 0;
    let samples = 0;
    let visible = true;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const start = performance.now();

    const target = () => Math.min(1, Math.max(0, (window.scrollY - geom.current.start) / geom.current.distance));
    // "?hq" keeps maximum quality (no automatic downgrade) — for previewing on a strong machine.
    const keepQuality = new URLSearchParams(window.location.search).has("hq");

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      frameCount++;
      const t = target();
      smoothed = smoothed < 0 ? t : smoothed + (t - smoothed) * (1 - Math.exp(-dt * 7));
      const settled = Math.abs(t - smoothed) < 0.00005;
      if (settled) smoothed = t;
      pointer.x += (pointer.tx - pointer.x) * (1 - Math.exp(-dt * 4));
      pointer.y += (pointer.ty - pointer.y) * (1 - Math.exp(-dt * 4));
      const pointerSettled = Math.abs(pointer.tx - pointer.x) + Math.abs(pointer.ty - pointer.y) < 0.002;
      onProgressRef.current?.(smoothed);

      const scene = sceneRef.current;
      // When nothing is moving but the steam, render at ~30fps to save battery.
      if (scene && (!(settled && pointerSettled) || frameCount % 2 === 0)) {
        scene.render(smoothed, (now - start) / 1000, pointer);
        if (samples === 0) sampleStart = now;
        samples++;
        if (samples === 45) {
          const avg = (now - sampleStart) / 44 / (settled && pointerSettled ? 2 : 1);
          if (avg > 30 && !keepQuality) scene.degrade();
          samples = 0;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
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
      if (visible) run();
      else stop();
    });
    io.observe(story);
    const onVisibility = () => (document.visibilityState === "visible" ? run() : stop());
    document.addEventListener("visibilitychange", onVisibility);
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
    run();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [mode, storyRef]);

  // Lazily load the 3D scene (a separate chunk) once the page is idle.
  useEffect(() => {
    if (mode !== "3d") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    let scene: CafeScene | null = null;
    let ro: ResizeObserver | null = null;

    const boot = async () => {
      try {
        const { createCafeScene } = await import("./scene/createCafeScene");
        if (cancelled) return;
        const narrow = window.matchMedia("(max-width: 767px), (pointer: coarse)").matches;
        const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
        const { path: camPath, sceneOptions: opts } = optionsRef.current;
        scene = createCafeScene(canvas, {
          logoUrl: opts.logoUrl || DEFAULT_LOGO,
          fallbackLogoUrl: DEFAULT_LOGO,
          boardTitle: opts.boardTitle,
          boardItems: opts.boardItems,
          fonts: {
            display: cssFont("--font-cormorant", "Georgia, serif"),
            caps: cssFont("--font-cinzel", "Georgia, serif"),
            sans: cssFont("--font-manrope", "system-ui, sans-serif"),
          },
          path: camPath,
          quality: narrow || weak ? "low" : "high",
        });
        const fit = () => scene?.resize(canvas.clientWidth, canvas.clientHeight);
        fit();
        ro = new ResizeObserver(fit);
        ro.observe(canvas);
        await scene.ready;
        if (cancelled) return;
        sceneRef.current = scene;
        setSceneReady(true);
      } catch (error) {
        // WebGL context failure etc. — the poster stays, the story still works.
        console.warn("[TWO RR] 3D café unavailable:", error);
      }
    };

    // Safari has no requestIdleCallback; fall back to a short timeout.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const handle = hasIdle ? window.requestIdleCallback(() => void boot(), { timeout: 1200 }) : window.setTimeout(() => void boot(), 200);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      ro?.disconnect();
      sceneRef.current = null;
      scene?.dispose();
    };
  }, [mode, canvasRef]);

  function scrollToProgress(p: number) {
    const { start, distance, headerH } = geom.current;
    const story = storyRef.current;
    // p > 1 means "past the story" (Skip intro).
    const y = p > 1 && story ? story.getBoundingClientRect().top + window.scrollY + story.offsetHeight - headerH : start + p * distance;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  return { mode, sceneReady, scrollToProgress };
}
