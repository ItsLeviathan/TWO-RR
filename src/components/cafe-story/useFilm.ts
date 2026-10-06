"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createFilmStage, type Film, type FilmStage, type Scene } from "./filmStage";
import type { StoryMode } from "./useScrollStory";

/**
 * Boots the scroll-scrubbed film on `canvasRef` once the page is idle. Skipped in the static
 * (reduced-motion) layout and for visitors with data-saver on — they keep the poster frames.
 * `ready` turns true once the first frame can be drawn.
 */
export function useFilm(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  films: Film[],
  mode: StoryMode,
  /** Current film state, read when the stage boots (scroll may already be mid-story). */
  current: () => Scene,
) {
  const [ready, setReady] = useState(false);
  const stageRef = useRef<FilmStage | null>(null);
  const setup = useRef({ films, current });
  useEffect(() => {
    setup.current = { films, current };
  });

  useEffect(() => {
    if (mode !== "scroll") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData) return;

    let stage: FilmStage | null = null;
    let ro: ResizeObserver | null = null;
    const boot = () => {
      try {
        stage = createFilmStage(canvas, setup.current.films, { onFirstFrame: () => setReady(true) });
        stage.render(setup.current.current());
        stageRef.current = stage;
        ro = new ResizeObserver(() => stage?.resize());
        ro.observe(canvas);
      } catch (error) {
        // No canvas 2D — the poster frames stay, the story still works.
        console.warn("[TWO RR] café film unavailable:", error);
      }
    };
    // Safari has no requestIdleCallback; fall back to a short timeout.
    const hasIdle = typeof window.requestIdleCallback === "function";
    const handle = hasIdle ? window.requestIdleCallback(boot, { timeout: 800 }) : window.setTimeout(boot, 120);

    return () => {
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      ro?.disconnect();
      stage?.dispose();
      stageRef.current = null;
      setReady(false);
    };
  }, [mode, canvasRef]);

  return { ready, stageRef };
}
