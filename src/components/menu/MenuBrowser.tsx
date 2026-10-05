"use client";

import { useDeferredValue, useState } from "react";
import { Search, X } from "lucide-react";
import { ProductCard } from "@/components/products/ProductCard";
import { EmptyState } from "@/components/ui/states";
import type { MenuCategory } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

export function MenuBrowser({
  categories,
  orderingEnabled,
  initialCategory,
}: {
  categories: MenuCategory[];
  orderingEnabled: boolean;
  /** Category slug from ?category=… (links from the home page menu board). */
  initialCategory?: string;
}) {
  const [active, setActive] = useState<string>(() => categories.find((c) => c.slug === initialCategory)?.id ?? "all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const tabs = [{ id: "all", name: "All" }, ...categories.filter((c) => c.products.length > 0).map((c) => ({ id: c.id, name: c.name }))];
  const visibleCategories = categories
    .filter((c) => active === "all" || c.id === active)
    .map((c) => ({
      ...c,
      products: deferredQuery
        ? c.products.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(deferredQuery))
        : c.products,
    }))
    .filter((c) => c.products.length > 0);

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-4 border-b border-cream-200 bg-cream-50/92 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-[4.5rem] lg:-mx-8 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="group" aria-label="Filter by category" className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active === tab.id}
                onClick={() => setActive(tab.id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                  active === tab.id
                    ? "border-espresso-900 bg-espresso-900 text-gold-200"
                    : "border-cream-300 bg-white text-ink-soft hover:border-gold-500 hover:text-ink",
                )}
              >
                {tab.name}
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <label htmlFor="menu-search" className="sr-only">
              Search the menu
            </label>
            <input
              id="menu-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the menu"
              className="input rounded-full pl-10 pr-10"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-cream-100"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {visibleCategories.length === 0 ? (
        <EmptyState
          title={deferredQuery ? "Nothing matches that search." : "The menu is being prepared."}
          description={deferredQuery ? "Try a different word, or browse all categories." : "Please check back soon."}
          action={
            deferredQuery ? (
              <button type="button" className="btn btn-outline" onClick={() => { setQuery(""); setActive("all"); }}>
                Show the full menu
              </button>
            ) : undefined
          }
        />
      ) : (
        // Keyed on the filter so the grid re-animates when the filter changes.
        <div key={`${active}:${deferredQuery}`} className="space-y-16 py-10">
          {visibleCategories.map((category, ci) => (
            <section key={category.id} aria-labelledby={`cat-${category.id}`}>
              <div className="flex items-baseline gap-4">
                <h2 id={`cat-${category.id}`} className="display text-3xl text-ink sm:text-4xl">
                  {category.name}
                </h2>
                <span className="h-px flex-1 bg-gradient-to-r from-gold-500/50 to-transparent" aria-hidden />
                <span className="text-sm text-ink-muted">
                  {category.products.length} item{category.products.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.products.map((p, i) => (
                  <li key={p.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                    <div className="scroll-3d h-full">
                      <ProductCard product={p} orderingEnabled={orderingEnabled} priority={ci === 0 && i < 4} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
