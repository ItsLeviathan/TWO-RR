"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronsDown, MapPin } from "lucide-react";
import { GoldRule } from "@/components/branding/Ornaments";
import { formatPesoShort } from "@/lib/money";
import { cn } from "@/lib/utils";
import { frameUrl } from "./filmStage";
import { CHAPTERS, chapterVisibility, storyScene } from "./story";
import { useFilm } from "./useFilm";
import { useScrollStory } from "./useScrollStory";

const FILMS = CHAPTERS.map((c) => c.film);

export type CafeStoryProps = {
  businessName: string;
  tagline: string;
  orderingEnabled: boolean;
  categories: { name: string; slug: string }[];
  orderTypeLabels: string[];
  featured: { name: string; slug: string; priceCents: number }[];
  visit: { address: string | null; openingHours: string | null; mapUrl: string | null };
};

/**
 * Home page: a scroll-driven walk through the café on film — one turn of the clock.
 * Scroll scrubs real footage frame by frame (an espresso pours, latte art draws itself), with a
 * slow push-in and a crossfade between chapters. Poster frames show until the film is ready and
 * in the reduced-motion layout; the chapters are real HTML, so everything reads without motion.
 */
export function CafeStory(props: CafeStoryProps) {
  const storyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressRef = useRef(0);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pourRef = useRef<HTMLSpanElement>(null);
  const cupRef = useRef<SVGRectElement>(null);
  const steamRef = useRef<SVGGElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);

  const { mode, scrollToProgress } = useScrollStory({
    storyRef,
    onProgress: (p) => {
      progressRef.current = p;
      const scene = storyScene(p);
      if (stageRef.current) stageRef.current.render(scene);
      else
        // Until the film is ready: the poster frames crossfade instead of turning.
        posterRefs.current.forEach((el, i) => {
          if (!el) return;
          const shot = i === scene.a.film ? scene.a : i === scene.b?.film ? scene.b : null;
          el.style.opacity = String(i === scene.a.film ? 1 : shot ? scene.e : 0);
          el.style.zIndex = String(i === scene.b?.film ? 1 : 0);
          el.style.transform = `scale(${1 + 0.05 * (shot?.local ?? 0)})`;
        });
      CHAPTERS.forEach((c, i) => {
        const el = chapterRefs.current[i];
        if (!el) return;
        const v = chapterVisibility(c, p);
        const dir = p < c.focus ? 1 : -1;
        el.style.opacity = String(v);
        el.style.transform = `translate3d(0, ${(1 - v) * 28 * dir}px, 0)`;
        el.style.pointerEvents = v > 0.6 ? "auto" : "none";
      });
      // The pour line reaches each bean exactly at its chapter; the cup fills with the whole story.
      if (pourRef.current) pourRef.current.style.transform = `scaleY(${railProgress(p)})`;
      if (cupRef.current) cupRef.current.setAttribute("y", String(CUP_TOP + (1 - p) * CUP_DEPTH));
      if (steamRef.current) steamRef.current.style.opacity = String(Math.max(0, (p - 0.9) / 0.1));
      if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - p * 14));
      if (skipRef.current) {
        const hidden = p > 0.9;
        skipRef.current.style.opacity = hidden ? "0" : "1";
        skipRef.current.style.pointerEvents = hidden ? "none" : "auto";
        skipRef.current.tabIndex = hidden ? -1 : 0;
      }
      // The chapter nearest the current position (also between chapters, when none is fully visible).
      let best = 0;
      CHAPTERS.forEach((c, i) => {
        if (Math.abs(p - c.focus) < Math.abs(p - CHAPTERS[best]!.focus)) best = i;
      });
      setActive((prev) => (prev === best ? prev : best));
    },
  });

  const story = mode !== "static";
  const { ready: filmReady, stageRef } = useFilm(canvasRef, FILMS, mode, () => storyScene(progressRef.current));

  const content: Record<string, ReactNode> = {
    beans: (
      <>
        <p className="eyebrow text-gold-400">It starts with the bean</p>
        <h1 className="mt-5 font-caps text-[clamp(3.1rem,10vw,6.6rem)] font-semibold leading-[0.95] tracking-[0.08em] text-cream-50">
          {props.businessName}
        </h1>
        <p className="mt-5 font-display text-[clamp(1.6rem,4vw,2.5rem)] italic leading-tight text-gold-300">{props.tagline}</p>
        <GoldRule className="mt-7 max-w-xs" />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href="/menu" className="btn btn-gold btn-lg">
            {props.orderingEnabled ? "Explore Menu" : "View Menu"} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/about" className="btn btn-outline-light btn-lg">
            Discover {props.businessName}
          </Link>
        </div>
      </>
    ),
    grind: (
      <>
        <p className="eyebrow text-gold-400">Ground to order</p>
        <h2 className="display mt-4 text-[clamp(2.6rem,6vw,4.5rem)] text-cream-50">Fresh, every time.</h2>
        <p className="mt-4 text-lg leading-relaxed text-cream-200/85">
          {props.categories.length > 0
            ? `${listFormat(props.categories.map((c) => c.name))} — the whole ${props.businessName} menu, one tap away.`
            : `The ${props.businessName} menu is being prepared.`}
        </p>
        <Link href="/menu" className="btn btn-gold mt-7">
          See the menu <ArrowRight className="h-4 w-4" />
        </Link>
      </>
    ),
    tamp: (
      <>
        <p className="eyebrow text-gold-400">Pressed with care</p>
        <h2 className="display mt-4 text-[clamp(2.6rem,6vw,4.5rem)] text-cream-50">Made for you.</h2>
        <p className="mt-4 text-lg leading-relaxed text-cream-200/85">
          {props.orderTypeLabels.length > 0
            ? `Order ahead online — ${listFormat(props.orderTypeLabels).toLowerCase()} — and pay at the counter when you collect.`
            : "Pull up a seat and take your time."}
        </p>
        {props.orderingEnabled && (
          <Link href="/menu" className="btn btn-outline-light mt-7">
            Start an order
          </Link>
        )}
      </>
    ),
    pull: (
      <>
        <p className="eyebrow text-gold-400">The pull</p>
        <h2 className="display mt-4 text-[clamp(2.6rem,6vw,4.5rem)] text-cream-50">Good Coffee.</h2>
        <p className="mt-4 text-lg leading-relaxed text-cream-200/85">
          A slow, golden shot of espresso: the heart of every cup we pour, and the start of a great moment.
        </p>
        <Link href="/about" className="btn btn-outline-light mt-7">
          Our story <ArrowRight className="h-4 w-4" />
        </Link>
      </>
    ),
    pour: (
      <>
        <p className="eyebrow text-gold-400">The pour</p>
        <h2 className="display mt-4 text-[clamp(2.4rem,5.5vw,4rem)] text-cream-50">On the board today</h2>
        {props.featured.length > 0 ? (
          <ul className="mt-5 divide-y divide-gold-500/20 border-y border-gold-500/20">
            {props.featured.slice(0, 4).map((f) => (
              <li key={f.slug}>
                <Link href={`/menu/${f.slug}`} className="flex items-baseline justify-between gap-4 py-2.5 text-cream-100 transition hover:text-gold-300">
                  <span className="font-display text-xl">{f.name}</span>
                  <span className="font-semibold tabular-nums text-gold-300">{formatPesoShort(f.priceCents)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-lg text-cream-200/85">Browse everything we serve on the full menu.</p>
        )}
        {props.categories.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-2">
            {props.categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/menu?category=${c.slug}`} className="btn btn-outline-light btn-sm">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </>
    ),
    cup: (
      <>
        <p className="eyebrow text-gold-400">Your cup is ready</p>
        <h2 className="display mt-4 text-[clamp(2.4rem,6vw,4.5rem)] text-cream-50">Your table at {props.businessName}.</h2>
        {props.visit.address ? (
          <p className="mx-auto mt-4 flex max-w-xl items-start justify-center gap-2 whitespace-pre-line text-lg text-cream-200/85">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-gold-400" aria-hidden /> {props.visit.address}
          </p>
        ) : (
          <p className="mt-4 text-lg text-cream-200/85">Our location and opening hours will be posted here soon.</p>
        )}
        {props.visit.openingHours && <p className="mt-2 whitespace-pre-line text-cream-200/70">{props.visit.openingHours}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {props.orderingEnabled && (
            <Link href="/menu" className="btn btn-gold btn-lg">
              Order Now <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link href="/contact" className="btn btn-outline-light btn-lg">
            Location &amp; Contact
          </Link>
          {props.visit.mapUrl && (
            <a href={props.visit.mapUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-light btn-lg">
              Get Directions
            </a>
          )}
        </div>
      </>
    ),
  };

  return (
    <section ref={storyRef} className="cafe-story" data-mode={mode} aria-label={`Welcome to ${props.businessName}`}>
      <div className="cafe-stage">
        {/* Poster frames, stacked in order: shown until the film is ready, and in static mode
            (where only the first shows, behind the welcome). */}
        <div className={cn("cafe-photos", filmReady && "is-covered")}>
          {CHAPTERS.map((c, i) => (
            <div
              key={c.id}
              ref={(el) => {
                posterRefs.current[i] = el;
              }}
              className="cafe-photo"
            >
              <Image
                src={frameUrl(c.film, "w1920", c.film.poster)}
                alt={i === 0 ? c.film.alt : ""}
                fill
                sizes="100vw"
                priority={i === 0}
                quality={80}
                className="object-cover"
              />
            </div>
          ))}
        </div>
        {story && <canvas ref={canvasRef} className={cn("cafe-film", filmReady && "is-ready")} aria-hidden="true" />}
        <div className="cafe-scrim" aria-hidden="true" />

        {CHAPTERS.map((c, i) => (
          <div
            key={c.id}
            ref={(el) => {
              chapterRefs.current[i] = el;
            }}
            className="cafe-chapter"
            data-side={c.side}
            data-first={i === 0 ? "" : undefined}
            // Keyboard users tabbing into a chapter's links are taken to that point of the story.
            onFocusCapture={() => {
              if (story && active !== i) scrollToProgress(c.focus);
            }}
          >
            <div className="cafe-panel">{content[c.id]}</div>
          </div>
        ))}

        {story && (
          <>
            <div ref={hintRef} className="cafe-hint" aria-hidden="true">
              <span>Scroll to step inside</span>
              <ChevronsDown className="h-4 w-4 animate-bounce" />
            </div>
            {/* Progress: coffee pours down a rail of beans (one per chapter) into a cup that fills. */}
            <nav className="cafe-progress" aria-label="Story chapters">
              <div className="cafe-rail">
                <span className="cafe-rail-line" aria-hidden="true">
                  <span ref={pourRef} className="cafe-rail-pour" />
                </span>
                <ol>
                  {CHAPTERS.map((c, i) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => scrollToProgress(c.focus)}
                        aria-current={active === i ? "step" : undefined}
                        className={cn("cafe-bean", active === i && "is-active", i < active && "is-past")}
                      >
                        <span className="cafe-bean-label">{c.label}</span>
                        <svg viewBox="0 0 16 20" className="cafe-bean-icon" aria-hidden="true">
                          <ellipse cx="8" cy="10" rx="6.2" ry="8.6" />
                          <path d="M8.6 2.2c-2.6 2.6-2.6 5.2-.6 7.8s2 5.2-.6 7.8" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
              <svg viewBox="0 0 48 48" className="cafe-cup" aria-hidden="true">
                <defs>
                  <clipPath id="cafe-cup-inside">
                    <path d="M10 18h24l-2.4 15.2A5 5 0 0 1 26.7 37.5h-9.4a5 5 0 0 1-4.9-4.3Z" />
                  </clipPath>
                  <linearGradient id="cafe-cup-coffee" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#c08a4a" />
                    <stop offset="0.18" stopColor="#6b3f1d" />
                    <stop offset="1" stopColor="#2a180c" />
                  </linearGradient>
                </defs>
                <g ref={steamRef} className="cafe-cup-steam" style={{ opacity: 0 }}>
                  <path d="M18 14c-2-2.4 2-4.2 0-7" />
                  <path d="M24 14c-2-2.4 2-4.2 0-7.5" />
                  <path d="M30 14c-2-2.4 2-4.2 0-7" />
                </g>
                <rect ref={cupRef} clipPath="url(#cafe-cup-inside)" x="8" y={CUP_TOP + CUP_DEPTH} width="28" height="24" fill="url(#cafe-cup-coffee)" />
                <path className="cafe-cup-body" d="M10 18h24l-2.4 15.2A5 5 0 0 1 26.7 37.5h-9.4a5 5 0 0 1-4.9-4.3Z" />
                <path className="cafe-cup-body" d="M33.4 21.5h2.1a4 4 0 0 1 0 8h-3.2" />
                <path className="cafe-cup-body" d="M7 41h31" />
              </svg>
            </nav>
            <button ref={skipRef} type="button" className="cafe-skip" onClick={() => scrollToProgress(1.0001)}>
              Skip intro
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/** Coffee level in the cup's 0–48 viewBox: the inside runs from y = 18 (full) to 37.5 (empty). */
const CUP_TOP = 18;
const CUP_DEPTH = 19.5;

/** Story progress → how far down the rail the pour has reached (bean i sits at i / (n − 1)). */
function railProgress(p: number): number {
  const last = CHAPTERS.length - 1;
  for (let i = 0; i < last; i++) {
    const a = CHAPTERS[i]!.focus;
    const b = CHAPTERS[i + 1]!.focus;
    if (p <= b) return (i + Math.max(0, (p - a) / (b - a))) / last;
  }
  return 1;
}

function listFormat(items: string[]): string {
  try {
    return new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}
