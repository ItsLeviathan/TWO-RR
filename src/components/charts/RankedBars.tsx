import { CHART_COLOR } from "@/lib/chart";

/**
 * Horizontal ranked bars with direct labels (name + value in ink, never in the bar color).
 * One series, so no legend is needed — the card title names it.
 */
export function RankedBars({
  rows,
  formatValue,
  secondary,
  emptyText,
}: {
  rows: { label: string; value: number; detail?: string }[];
  formatValue: (v: number) => string;
  secondary?: (row: { label: string; value: number; detail?: string }) => string | undefined;
  emptyText: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (rows.length === 0 || max === 0) return <p className="py-6 text-sm text-ink-muted">{emptyText}</p>;
  return (
    <ol className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium text-ink">{r.label}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-ink">{formatValue(r.value)}</span>
              {secondary?.(r) && <span className="ml-2 text-ink-muted">{secondary(r)}</span>}
            </span>
          </div>
          <div className="mt-1.5 h-2 rounded-full bg-cream-100">
            <div
              className="h-2 rounded-full"
              style={{ width: `${Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)}%`, background: CHART_COLOR }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
