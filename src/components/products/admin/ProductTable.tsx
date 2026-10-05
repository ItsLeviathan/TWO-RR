"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Pencil, Search, Star } from "lucide-react";
import { Switch } from "@/components/ui/controls";
import { ProductImage } from "@/components/ui/ProductImage";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { setProductAvailability } from "@/server/actions/products";
import type { AdminProductRow } from "@/server/admin-queries";

const STOCK_LABEL = { untracked: "Not tracked", in: "In Stock", low: "Low Stock", out: "Out of Stock" } as const;
const STOCK_STYLE = {
  untracked: "text-ink-muted",
  in: "text-success-600",
  low: "text-warning-600",
  out: "text-danger-600",
} as const;

export function ProductTable({
  products,
  categories,
  readOnly = false,
}: {
  products: AdminProductRow[];
  categories: { id: string; name: string }[];
  /** Cashier view: availability and stock are shown, nothing can be changed. */
  readOnly?: boolean;
}) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(products, (state, update: { id: string; isAvailable: boolean }) =>
    state.map((p) => (p.id === update.id ? { ...p, isAvailable: update.isAvailable } : p)),
  );

  const q = query.trim().toLowerCase();
  const visible = optimistic.filter(
    (p) => (!category || p.categoryId === category) && (!q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)),
  );

  function toggle(p: AdminProductRow, isAvailable: boolean) {
    startTransition(async () => {
      setOptimistic({ id: p.id, isAvailable });
      const result = await setProductAvailability({ id: p.id, isAvailable });
      if (result.ok) toast.show(`${p.name} is now ${isAvailable ? "available" : "unavailable"}`);
      else toast.show(result.error, "error");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <label htmlFor="product-search" className="sr-only">
            Search products
          </label>
          <input
            id="product-search"
            type="search"
            className="input pl-10"
            placeholder="Search by name or SKU"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <label htmlFor="product-category" className="sr-only">
          Category
        </label>
        <select id="product-category" className="input sm:w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        {visible.length === 0 ? (
          <EmptyState title="No products match." description="Try a different search or category." />
        ) : (
          <ul className="divide-y divide-cream-200">
            {visible.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-3 sm:flex-nowrap sm:px-5">
                <ProductImage src={p.imageUrl} name={p.name} sizes="56px" className="h-14 w-14 shrink-0" rounded="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    <span className="truncate">{p.name}</span>
                    {p.isFeatured && <Star className="h-3.5 w-3.5 shrink-0 fill-gold-400 text-gold-500" aria-label="Featured" />}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {p.categoryName}
                    {!p.categoryActive && " (category hidden)"}
                    {p.sku && ` · ${p.sku}`}
                  </p>
                </div>
                <div className="w-24 text-right font-semibold tabular-nums">{formatPeso(p.priceCents)}</div>
                <div className={cn("w-28 text-sm font-medium", STOCK_STYLE[p.stockStatus])}>
                  {STOCK_LABEL[p.stockStatus]}
                  {p.stockQuantity !== null && <span className="block text-xs text-ink-muted">{p.stockQuantity} in stock</span>}
                </div>
                {readOnly ? (
                  <span
                    className={cn(
                      "chip ring-1 ring-inset",
                      p.isAvailable && p.categoryActive
                        ? "bg-success-50 text-success-600 ring-success-600/25"
                        : "bg-cream-100 text-ink-muted ring-cream-300",
                    )}
                  >
                    {p.isAvailable && p.categoryActive ? "Available" : "Unavailable"}
                  </span>
                ) : (
                  <>
                    <Switch checked={p.isAvailable} onChange={(v) => toggle(p, v)} label={p.isAvailable ? "Available" : "Unavailable"} />
                    <Link href={`/admin/products/${p.id}`} className="btn btn-outline btn-sm" aria-label={`Edit ${p.name}`}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
