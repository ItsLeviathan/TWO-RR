import { cn } from "@/lib/utils";

/** The coffee bean from beneath "COFFEE" on the logo plaque. */
export function Bean({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 22" aria-hidden="true" className={cn("h-[1em] w-auto", className)}>
      <ellipse cx="8" cy="11" rx="7" ry="10" fill="currentColor" />
      <path d="M8 2.2c-2.6 3.4 2.6 6.2 0 8.8s2.6 5.6 0 8.8" fill="none" stroke="rgb(0 0 0 / 0.45)" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** Line — bean — line divider, as on the logo under "COFFEE". */
export function GoldRule({ className, tone = "gold" }: { className?: string; tone?: "gold" | "muted" }) {
  const color = tone === "gold" ? "text-gold-500" : "text-cream-400";
  return (
    <div className={cn("flex items-center gap-3", color, className)} aria-hidden="true">
      <span className="h-px flex-1 bg-current opacity-70" />
      <Bean className="h-3" />
      <span className="h-px flex-1 bg-current opacity-70" />
    </div>
  );
}

/**
 * Clock-face ring: 60 minute ticks with emphasised hour marks, from the logo's dial.
 * Ticks fade in once on load (CSS only — no JS, respects reduced motion).
 */
export function ClockRing({ className, animate = true }: { className?: string; animate?: boolean }) {
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={cn("text-gold-500", className)}>
      <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="0.5" />
      {ticks.map((i) => {
        const hour = i % 5 === 0;
        return (
          <line
            key={i}
            x1="100"
            y1={hour ? 4 : 5.5}
            x2="100"
            y2={hour ? 13 : 9}
            stroke="currentColor"
            strokeWidth={hour ? 1.4 : 0.6}
            strokeOpacity={hour ? 0.95 : 0.5}
            strokeLinecap="round"
            transform={`rotate(${i * 6} 100 100)`}
            style={animate ? { animation: `tick-in 0.5s ease-out ${200 + i * 18}ms both` } : undefined}
          />
        );
      })}
    </svg>
  );
}

/** Small clock glyph used as section markers: a dial with hands set to the given hour. */
export function ClockMark({ hour = 12, className }: { hour?: number; className?: string }) {
  const angle = (hour % 12) * 30;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn("h-5 w-5 text-gold-500", className)}>
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="12" y1="12" x2="12" y2="4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line
        x1="12"
        y1="12"
        x2="12"
        y2="7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        transform={`rotate(${angle} 12 12)`}
      />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}
