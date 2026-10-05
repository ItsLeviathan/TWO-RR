"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { QuantityStepper } from "@/components/ui/controls";
import type { MenuProduct } from "@/lib/menu-types";
import { formatPeso, formatPesoShort } from "@/lib/money";
import { defaultOptionIds, describeSelection, groupOptions, MAX_LINE_QUANTITY, resolveSelection } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export type ConfiguredLine = {
  optionIds: string[];
  addonIds: string[];
  quantity: number;
  unitPriceCents: number;
  summary: string;
};

/**
 * Options (one per group), add-ons, quantity and a live total. Used on the product page and in
 * the POS. Only options/add-ons configured for the product are displayed.
 */
export function ProductConfigurator({
  product,
  initial,
  submitLabel,
  onSubmit,
  disabledReason,
  compact = false,
}: {
  product: MenuProduct;
  initial?: { optionIds: string[]; addonIds: string[]; quantity: number };
  submitLabel: (totalCents: number) => string;
  onSubmit: (line: ConfiguredLine) => void;
  /** When set, the add button is disabled and this reason is shown instead. */
  disabledReason?: string | null;
  compact?: boolean;
}) {
  const groups = groupOptions(product.options);
  const availableAddons = product.addons.filter((a) => a.isAvailable);
  const maxQty = product.stockQuantity !== null ? Math.max(1, Math.min(MAX_LINE_QUANTITY, product.stockQuantity)) : MAX_LINE_QUANTITY;

  const validInitialOptions = (() => {
    if (!initial) return defaultOptionIds(product.options);
    const check = resolveSelection(product, initial.optionIds, []);
    return check.ok ? initial.optionIds : defaultOptionIds(product.options);
  })();

  const [optionIds, setOptionIds] = useState<string[]>(validInitialOptions);
  const [addonIds, setAddonIds] = useState<string[]>(
    (initial?.addonIds ?? []).filter((id) => availableAddons.some((a) => a.id === id)),
  );
  const [quantity, setQuantity] = useState(Math.min(initial?.quantity ?? 1, maxQty));

  const selection = resolveSelection(product, optionIds, addonIds);
  const unit = selection.ok ? selection.unitPriceCents : product.priceCents;
  const total = unit * quantity;

  function chooseOption(groupName: string, id: string) {
    const groupIds = new Set(groups.find((g) => g.name === groupName)?.options.map((o) => o.id));
    setOptionIds((current) => [...current.filter((x) => !groupIds.has(x)), id]);
  }

  function toggleAddon(id: string) {
    setAddonIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }

  return (
    <form
      className={cn("flex flex-col", compact ? "gap-5" : "gap-7")}
      onSubmit={(e) => {
        e.preventDefault();
        if (!selection.ok || disabledReason) return;
        onSubmit({
          optionIds,
          addonIds,
          quantity,
          unitPriceCents: selection.unitPriceCents,
          summary: describeSelection(selection.options, selection.addons),
        });
      }}
    >
      {groups.map((group) => (
        <fieldset key={group.name}>
          <legend className="eyebrow mb-3 text-gold-700">{group.name}</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {group.options.map((option) => {
              const checked = optionIds.includes(option.id);
              return (
                <label
                  key={option.id}
                  className={cn(
                    "relative flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border px-4 py-2.5 transition",
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 has-[:focus-visible]:ring-offset-2",
                    checked ? "border-espresso-900 bg-espresso-900 text-cream-50" : "border-cream-300 bg-white hover:border-gold-500",
                  )}
                >
                  <input
                    type="radio"
                    name={`group-${group.name}`}
                    className="sr-only"
                    checked={checked}
                    onChange={() => chooseOption(group.name, option.id)}
                  />
                  <span className="font-semibold">{option.name}</span>
                  <span className={cn("text-xs", checked ? "text-gold-300" : "text-ink-muted")}>
                    {option.priceDeltaCents > 0 ? `+${formatPesoShort(option.priceDeltaCents)}` : "Included"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {availableAddons.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3 text-gold-700">Add-ons</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableAddons.map((addon) => {
              const checked = addonIds.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={cn(
                    "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2.5 transition",
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-gold-500 has-[:focus-visible]:ring-offset-2",
                    checked ? "border-gold-600 bg-gold-100/60" : "border-cream-300 bg-white hover:border-gold-500",
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleAddon(addon.id)} />
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition",
                      checked ? "border-espresso-900 bg-espresso-900 text-gold-300" : "border-cream-400 bg-white",
                    )}
                    aria-hidden
                  >
                    {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                  <span className="flex-1 font-medium">{addon.name}</span>
                  <span className="text-sm text-ink-muted">+{formatPesoShort(addon.priceCents)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div>
        <p className="eyebrow mb-3 text-gold-700" id="qty-label">
          Quantity
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <QuantityStepper value={quantity} onChange={setQuantity} max={maxQty} size="lg" />
          {product.stockStatus === "low" && product.stockQuantity !== null && (
            <span className="text-sm font-medium text-warning-600">Only {product.stockQuantity} left</span>
          )}
        </div>
      </div>

      <div className={cn("border-t border-cream-200 pt-5", !compact && "sticky bottom-0 -mx-1 bg-cream-50/95 px-1 pb-2 backdrop-blur")}>
        <div className="mb-3 flex items-baseline justify-between">
          <span className="text-sm font-medium text-ink-muted">Total</span>
          <span className="text-2xl font-bold tabular-nums text-ink" aria-live="polite">
            {formatPeso(total)}
          </span>
        </div>
        {!selection.ok && <p className="field-error mb-2">{selection.error}</p>}
        {disabledReason ? (
          <p className="rounded-xl bg-cream-100 px-4 py-3 text-center text-sm font-medium text-ink-muted">{disabledReason}</p>
        ) : (
          <button type="submit" className="btn btn-gold btn-lg w-full" disabled={!selection.ok}>
            {submitLabel(total)}
          </button>
        )}
      </div>
    </form>
  );
}
