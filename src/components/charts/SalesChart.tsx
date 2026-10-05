"use client";

import { useState } from "react";
import { formatShortDate } from "@/lib/format";
import { CHART_COLOR } from "@/lib/chart";
import { formatPeso, formatPesoShort } from "@/lib/money";


type Point = { day: string; salesCents: number; orders: number };

/**
 * Daily sales columns — one series, one axis. Each bar is its own hover/focus target with a
 * tooltip; the same values are available in the table view below the chart.
 */
export function SalesChart({ series }: { series: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...series.map((p) => p.salesCents), 0);
  const niceMax = niceCeil(max);
  const ticks = [0, 0.5, 1].map((f) => Math.round(niceMax * f));
  const dense = series.length > 14;
  const dateOf = (key: string) => formatShortDate(`${key}T12:00:00+08:00`);

  if (max === 0) {
    return <p className="py-16 text-center text-sm text-ink-muted">No paid sales in this period yet.</p>;
  }

  return (
    <div>
      <div className="relative flex h-64 gap-3">
        {/* Y axis */}
        <div className="flex w-14 shrink-0 flex-col-reverse justify-between pb-6 text-right text-[11px] tabular-nums text-ink-muted">
          {ticks.map((t) => (
            <span key={t} className="-translate-y-1/2 leading-none first:translate-y-0">
              {formatPesoShort(t)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {/* Recessive gridlines */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((t) => (
              <span key={t} className="border-t border-cream-200" />
            ))}
          </div>
          <ul className="absolute inset-x-0 bottom-6 top-0 flex items-end gap-[2px]" aria-label="Daily sales">
            {series.map((p, i) => {
              const h = niceMax ? (p.salesCents / niceMax) * 100 : 0;
              return (
                <li key={p.day} className="relative flex h-full flex-1 items-end">
                  <button
                    type="button"
                    className="group flex h-full w-full items-end justify-center focus-visible:outline-offset-0"
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive((a) => (a === i ? null : a))}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive((a) => (a === i ? null : a))}
                    aria-label={`${dateOf(p.day)}: ${formatPeso(p.salesCents)}, ${p.orders} order${p.orders === 1 ? "" : "s"}`}
                  >
                    <span
                      className="block w-full max-w-10 rounded-t-[4px] transition-[filter]"
                      style={{
                        height: `${Math.max(h, p.salesCents > 0 ? 1.5 : 0)}%`,
                        background: CHART_COLOR,
                        filter: active === i ? "brightness(1.15)" : undefined,
                      }}
                    />
                  </button>
                  {active === i && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-espresso-900 px-3 py-2 text-xs text-cream-100 shadow-lg"
                    >
                      <p className="text-sm font-bold tabular-nums text-cream-50">{formatPeso(p.salesCents)}</p>
                      <p className="text-cream-200/70">
                        {dateOf(p.day)} · {p.orders} order{p.orders === 1 ? "" : "s"}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {/* X axis labels */}
          <div className="absolute inset-x-0 bottom-0 flex h-5 gap-[2px] text-[11px] text-ink-muted" aria-hidden>
            {series.map((p, i) => (
              <span key={p.day} className="relative flex-1">
                {(!dense || i % 5 === 0) && (
                  <span className="absolute left-1/2 top-1 -translate-x-1/2 whitespace-nowrap">{dateOf(p.day)}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-medium text-gold-700">View as table</summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full text-left">
            <thead className="text-xs uppercase tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="py-1.5">Date</th>
                <th scope="col" className="py-1.5 text-right">Orders</th>
                <th scope="col" className="py-1.5 text-right">Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cream-200">
              {series.map((p) => (
                <tr key={p.day}>
                  <td className="py-1.5">{dateOf(p.day)}</td>
                  <td className="py-1.5 text-right tabular-nums">{p.orders}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatPeso(p.salesCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function niceCeil(cents: number): number {
  if (cents <= 0) return 0;
  const pesos = cents / 100;
  const magnitude = 10 ** Math.floor(Math.log10(pesos));
  const steps = [1, 2, 2.5, 5, 10];
  const step = steps.find((s) => s * magnitude >= pesos) ?? 10;
  return Math.round(step * magnitude * 100);
}
