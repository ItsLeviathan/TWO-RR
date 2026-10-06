"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { frameUrl, type Scene } from "./filmStage";
import { ABOUT_FILM } from "./story";
import { useFilm } from "./useFilm";
import { useScrollStory } from "./useScrollStory";

const FILMS = [ABOUT_FILM];
const frameAt = (p: number): Scene => ({ a: { film: 0, local: p }, b: null, e: 0, move: "push", diveAt: [0.5, 0.5], landAt: [0.5, 0.5] });

/** About page hero: a slow latte pour, scrubbed by scroll, behind the page title. */
export function AboutHero({ children }: { children: ReactNode }) {
  const storyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const { mode } = useScrollStory({
    storyRef,
    onProgress: (p) => {
      progressRef.current = p;
      if (stageRef.current) stageRef.current.render(frameAt(p));
      else if (posterRef.current) posterRef.current.style.transform = `scale(${1 + 0.05 * p})`;
      if (!panelRef.current) return;
      const v = 1 - Math.max(0, (p - 0.7) / 0.3);
      panelRef.current.style.opacity = String(v);
      panelRef.current.style.transform = `translate3d(0, ${(1 - v) * -24}px, 0)`;
    },
  });
  const { ready, stageRef } = useFilm(canvasRef, FILMS, mode, () => frameAt(progressRef.current));

  return (
    <section ref={storyRef} className="cafe-story cafe-story--short" data-mode={mode}>
      <div className="cafe-stage">
        <div className={cn("cafe-photos", ready && "is-covered")}>
          <div ref={posterRef} className="cafe-photo">
            <Image
              src={frameUrl(ABOUT_FILM, "w1920", ABOUT_FILM.poster)}
              alt={ABOUT_FILM.alt}
              fill
              sizes="100vw"
              priority
              quality={80}
              className="object-cover"
            />
          </div>
        </div>
        {mode !== "static" && <canvas ref={canvasRef} className={cn("cafe-film", ready && "is-ready")} aria-hidden="true" />}
        <div className="cafe-scrim" aria-hidden="true" />
        <div className="cafe-chapter" data-side="left" data-first="">
          <div ref={panelRef} className="cafe-panel">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
