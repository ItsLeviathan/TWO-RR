import type { ReactNode } from "react";
import { ClockMark } from "@/components/branding/Ornaments";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-14 text-center", className)}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/40 bg-cream-100">
        {icon ?? <ClockMark hour={3} className="h-7 w-7" />}
      </div>
      <h2 className="display text-2xl text-ink">{title}</h2>
      {description && <p className="mt-2 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorMessage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("rounded-xl border border-danger-600/30 bg-danger-50 px-4 py-3 text-sm text-danger-600", className)}>
      {children}
    </div>
  );
}

export function Notice({ children, className, tone = "info" }: { children: ReactNode; className?: string; tone?: "info" | "warning" }) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "info" ? "border-info-600/25 bg-info-50 text-info-600" : "border-warning-600/30 bg-warning-50 text-warning-600",
        className,
      )}
    >
      {children}
    </div>
  );
}
