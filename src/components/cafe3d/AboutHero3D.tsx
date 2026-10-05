"use client";

import { useRef, type ReactNode } from "react";
import { Logo } from "@/components/branding/Logo";
import { ClockRing } from "@/components/branding/Ornaments";
import { cn } from "@/lib/utils";
import { ABOUT_CAMERA_PATH } from "./story";
import { useScrollScene } from "./useScrollScene";

/** About page hero: a slow, scroll-driven move around the TWO RR clock on the café wall. */
export function AboutHero3D({ logoUrl, businessName, children }: { logoUrl: string | null; businessName: string; children: ReactNode }) {
  const storyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { mode, sceneReady } = useScrollScene({
    storyRef,
    canvasRef,
    path: ABOUT_CAMERA_PATH,
    sceneOptions: { logoUrl, boardTitle: businessName, boardItems: [] },
    onProgress: (p) => {
      if (!panelRef.current) return;
      const v = 1 - Math.max(0, (p - 0.7) / 0.3);
      panelRef.current.style.opacity = String(v);
      panelRef.current.style.transform = `translate3d(0, ${(1 - v) * -24}px, 0)`;
    },
  });

  return (
    <section ref={storyRef} className="cafe-story cafe-story--short" data-mode={mode}>
      <div className="cafe-stage">
        <div className={cn("cafe-poster", sceneReady && "is-hidden")} aria-hidden="true">
          <div className="cafe-poster-logo">
            <ClockRing className="absolute -inset-[9%] h-[118%] w-[118%]" />
            <Logo src={logoUrl} size={520} priority className="relative h-auto w-full drop-shadow-[0_30px_45px_rgb(0_0_0/0.55)]" />
          </div>
        </div>
        {mode !== "static" && <canvas ref={canvasRef} className={cn("cafe-canvas", sceneReady && "is-ready")} aria-hidden="true" />}
        {mode !== "static" && <div className="cafe-scrim" aria-hidden="true" />}
        <div className="cafe-chapter" data-side="left" data-first="">
          <div ref={panelRef} className="cafe-panel">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
