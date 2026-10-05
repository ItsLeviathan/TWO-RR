import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-cream-200 bg-white/60 px-4 py-6 sm:flex-row sm:items-end sm:justify-between sm:px-8">
      <div>
        <h1 className="display text-4xl text-ink">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent = false }: { label: string; value: ReactNode; hint?: ReactNode; accent?: boolean }) {
  return (
    <div className={accent ? "rounded-[var(--radius-card)] bg-espresso-900 p-5 text-cream-50" : "card p-5"}>
      <p className={accent ? "eyebrow text-gold-300" : "eyebrow text-gold-700"}>{label}</p>
      <p className={accent ? "mt-3 text-3xl font-bold tabular-nums text-gold-200" : "mt-3 text-3xl font-bold tabular-nums text-ink"}>{value}</p>
      {hint && <p className={accent ? "mt-1 text-sm text-cream-200/70" : "mt-1 text-sm text-ink-muted"}>{hint}</p>}
    </div>
  );
}
