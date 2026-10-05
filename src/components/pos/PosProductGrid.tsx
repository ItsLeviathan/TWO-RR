"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { EmptyState } from "@/components/ui/states";
import { hasCustomizations, type MenuCategory, type MenuProduct } from "@/lib/menu-types";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";

export function PosProductGrid({
  menu,
  onTap,
  quantityInOrder,
}: {
  menu: MenuCategory[];
  onTap: (p: MenuProduct) => void;
  quantityInOrder: (productId: string) => number;
}) {
  const categories = menu.filter((c) => c.products.length > 0);
  const [active, setActive] = useState<string>("all");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const products = categories
    .filter((c) => active === "all" || c.id === active)
    .flatMap((c) => c.products)
    .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q));

  return (
    <>
      <div className="shrink-0 space-y-3 border-b border-cream-300 bg-cream-50 p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-muted" aria-hidden />
          <label htmlFor="pos-search" className="sr-only">
            Search products
          </label>
          <input
            id="pos-search"
            type="search"
            className="input h-12 rounded-xl pl-11 pr-11 text-base"
            placeholder="Search products"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full hover:bg-cream-100"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div role="group" aria-label="Categories" className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1">
          {[{ id: "all", name: "All" }, ...categories].map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={active === c.id}
              onClick={() => setActive(c.id)}
              className={cn(
                "min-h-12 shrink-0 rounded-xl border px-5 text-base font-semibold transition",
                active === c.id ? "border-espresso-900 bg-espresso-900 text-gold-200" : "border-cream-300 bg-white text-ink hover:border-gold-500",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {products.length === 0 ? (
          <EmptyState
            title={q ? "No products match." : "No products yet."}
            description={q ? "Try another search." : "Add products in Admin → Products to start selling."}
          />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((p) => {
              const count = quantityInOrder(p.id);
              const remaining = p.stockQuantity !== null ? p.stockQuantity - count : null;
              const disabled = !p.isOrderable || (remaining !== null && remaining <= 0);
              const reason = !p.isAvailable ? "Unavailable" : p.stockStatus === "out" ? "Sold out" : remaining !== null && remaining <= 0 ? "No more stock" : null;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onTap(p)}
                    disabled={disabled}
                    className={cn(
                      "relative flex h-full min-h-28 w-full flex-col justify-between rounded-2xl border bg-white p-4 text-left transition",
                      "active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50",
                      count > 0 ? "border-gold-500 ring-2 ring-gold-400/40" : "border-cream-300 hover:border-gold-500 hover:shadow-md",
                    )}
                    aria-label={`${p.name}, ${formatPeso(p.priceCents)}${reason ? `, ${reason}` : ""}${count ? `, ${count} in order` : ""}`}
                  >
                    <span className={cn("text-base font-semibold leading-snug text-ink", (reason || (remaining !== null && p.stockStatus !== "untracked")) && "pr-16")}>{p.name}</span>
                    <span className="mt-3 flex items-end justify-between gap-2">
                      <span className="text-lg font-bold tabular-nums text-walnut-700">{formatPeso(p.priceCents)}</span>
                      {hasCustomizations(p) && <span className="text-xs font-medium text-ink-muted">Options</span>}
                    </span>
                    {reason ? (
                      <span className="chip absolute right-2 top-2 bg-espresso-900 text-cream-100">{reason}</span>
                    ) : remaining !== null && p.stockStatus !== "untracked" ? (
                      <span
                        className={cn(
                          "chip absolute right-2 top-2",
                          remaining <= 5 ? "bg-warning-50 text-warning-600" : "bg-cream-100 text-ink-muted",
                        )}
                      >
                        {remaining} left
                      </span>
                    ) : null}
                    {count > 0 && (
                      <span className="absolute -left-2 -top-2 flex h-7 min-w-7 items-center justify-center rounded-full bg-gold-400 px-1.5 text-sm font-bold text-espresso-900 shadow">
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
