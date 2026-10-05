"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowRight, ChevronsDown, MapPin } from "lucide-react";
import { Logo } from "@/components/branding/Logo";
import { ClockRing, GoldRule } from "@/components/branding/Ornaments";
import { formatPesoShort } from "@/lib/money";
import { cn } from "@/lib/utils";
import { CAFE_CAMERA_PATH, CHAPTERS, chapterVisibility } from "./story";
import { useScrollScene } from "./useScrollScene";

export type CafeStoryProps = {
  businessName: string;
  tagline: string;
  logoUrl: string | null;
  orderingEnabled: boolean;
  categories: { name: string; slug: string }[];
  orderTypeLabels: string[];
  featured: { name: string; slug: string; priceCents: number }[];
  visit: { address: string | null; openingHours: string | null; mapUrl: string | null };
};

/**
 * Home page: a scroll-driven walk into the 3D TWO RR café — one turn of the clock.
 * The chapters are real HTML (readable without the 3D layer); the canvas is enhancement.
 */
export function CafeStory(props: CafeStoryProps) {
  const storyRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chapterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const handRef = useRef<SVGGElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState(0);

  const { mode, sceneReady, scrollToProgress } = useScrollScene({
    storyRef,
    canvasRef,
    path: CAFE_CAMERA_PATH,
    sceneOptions: {
      logoUrl: props.logoUrl,
      boardTitle: props.businessName,
      boardItems: props.featured.map((f) => ({ name: f.name, price: formatPesoShort(f.priceCents) })),
    },
    onProgress: (p) => {
      CHAPTERS.forEach((c, i) => {
        const el = chapterRefs.current[i];
        if (!el) return;
        const v = chapterVisibility(c, p);
        const dir = p < c.focus ? 1 : -1;
        el.style.opacity = String(v);
        el.style.transform = `translate3d(0, ${(1 - v) * 28 * dir}px, 0)`;
        el.style.pointerEvents = v > 0.6 ? "auto" : "none";
      });
      if (handRef.current) handRef.current.style.transform = `rotate(${p * 360}deg)`;
      if (hintRef.current) hintRef.current.style.opacity = String(Math.max(0, 1 - p * 14));
      if (skipRef.current) {
        const hidden = p > 0.9;
        skipRef.current.style.opacity = hidden ? "0" : "1";
        skipRef.current.style.pointerEvents = hidden ? "none" : "auto";
        skipRef.current.tabIndex = hidden ? -1 : 0;
      }
      let best = 0;
      CHAPTERS.forEach((c, i) => {
        if (chapterVisibility(c, p) > chapterVisibility(CHAPTERS[best]!, p)) best = i;
      });
      setActive((prev) => (prev === best ? prev : best));
    },
  });

  const story = mode !== "static";

  const content: Record<string, ReactNode> = {
    welcome: (
      <>
        <p className="eyebrow text-gold-400">Coffee · Food · Moments</p>
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
    coffee: (
      <>
        <p className="eyebrow text-gold-400">3 · Good Coffee</p>
        <h2 className="display mt-4 text-[clamp(2.6rem,6vw,4.5rem)] text-cream-50">Good Coffee.</h2>
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
    moments: (
      <>
        <p className="eyebrow text-gold-400">6 · Great Moments</p>
        <h2 className="display mt-4 text-[clamp(2.6rem,6vw,4.5rem)] text-cream-50">Great Moments.</h2>
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
    menu: (
      <>
        <p className="eyebrow text-gold-400">9 · The Menu</p>
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
    visit: (
      <>
        <p className="eyebrow text-gold-400">12 · Visit</p>
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
        {/* Poster: the first frame, rendered instantly (and the whole visual in static mode). */}
        <div className={cn("cafe-poster", sceneReady && "is-hidden")} aria-hidden="true">
          <div className="cafe-poster-glow" />
          <div className="cafe-poster-logo">
            <ClockRing className="absolute -inset-[9%] h-[118%] w-[118%]" />
            <Logo src={props.logoUrl} size={520} priority className="relative h-auto w-full drop-shadow-[0_30px_45px_rgb(0_0_0/0.55)]" />
          </div>
        </div>
        {story && <canvas ref={canvasRef} className={cn("cafe-canvas", sceneReady && "is-ready")} aria-hidden="true" />}
        {story && <div className="cafe-scrim" aria-hidden="true" />}

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
            <nav className="cafe-dial" aria-label="Story chapters">
              <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden="true">
                <circle cx="32" cy="32" r="29" fill="rgb(20 17 13 / 0.75)" stroke="#bd904d" strokeWidth="1.5" />
                {Array.from({ length: 12 }, (_, i) => (
                  <line
                    key={i}
                    x1="32"
                    y1="6"
                    x2="32"
                    y2={i % 3 === 0 ? 11 : 8.5}
                    stroke="#e3c27e"
                    strokeWidth={i % 3 === 0 ? 2 : 1}
                    transform={`rotate(${i * 30} 32 32)`}
                  />
                ))}
                <g ref={handRef} style={{ transformOrigin: "32px 32px" }}>
                  <line x1="32" y1="32" x2="32" y2="11" stroke="#e3c27e" strokeWidth="2" strokeLinecap="round" />
                </g>
                <circle cx="32" cy="32" r="2.5" fill="#e3c27e" />
              </svg>
              <ol className="cafe-dial-list">
                {CHAPTERS.map((c, i) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => scrollToProgress(c.focus)}
                      aria-current={active === i ? "step" : undefined}
                      className={cn("cafe-dial-item", active === i && "is-active")}
                    >
                      <span className="tabular-nums">{c.hour}</span> {c.label}
                    </button>
                  </li>
                ))}
              </ol>
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

function listFormat(items: string[]): string {
  try {
    return new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(items);
  } catch {
    return items.join(", ");
  }
}
