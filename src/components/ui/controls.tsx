"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
  label = "Quantity",
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  label?: string;
}) {
  const btn = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <div className="inline-flex items-center rounded-full border border-cream-300 bg-white" role="group" aria-label={label}>
      <button
        type="button"
        className={cn("flex items-center justify-center rounded-full text-ink transition hover:bg-cream-100 disabled:opacity-35", btn)}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <Minus className="h-4 w-4" />
      </button>
      <output
        className={cn("min-w-8 text-center font-semibold tabular-nums", size === "lg" ? "text-lg" : "text-sm")}
        aria-live="polite"
      >
        {value}
      </output>
      <button
        type="button"
        className={cn("flex items-center justify-center rounded-full text-ink transition hover:bg-cream-100 disabled:opacity-35", btn)}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Radio-group styled as segmented buttons (keyboard accessible via native radios). */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  size = "md",
  className,
}: {
  name: string;
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-center font-semibold transition",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 has-[:focus-visible]:ring-offset-2",
            size === "lg" ? "min-h-14 text-base" : "min-h-11 text-sm",
            value === o.value
              ? "border-espresso-900 bg-espresso-900 text-cream-50"
              : "border-cream-300 bg-white text-ink hover:border-gold-500",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.icon}
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  srOnlyLabel = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  srOnlyLabel?: boolean;
}) {
  return (
    <label className={cn("inline-flex cursor-pointer items-center gap-3", disabled && "cursor-not-allowed opacity-60")}>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-cream-300 transition peer-checked:bg-success-600 peer-focus-visible:ring-2 peer-focus-visible:ring-gold-500 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      <span className={cn("text-sm font-medium text-ink", srOnlyLabel && "sr-only")}>{label}</span>
    </label>
  );
}
