"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { ProductImage } from "@/components/ui/ProductImage";
import { useToast } from "@/components/ui/Toast";
import { hasCustomizations, type MenuProduct } from "@/lib/menu-types";
import { formatPesoShort } from "@/lib/money";
import { cn } from "@/lib/utils";

export function ProductCard({ product, orderingEnabled, priority }: { product: MenuProduct; orderingEnabled: boolean; priority?: boolean }) {
  const cart = useCart();
  const toast = useToast();
  const customizable = hasCustomizations(product);
  const href = `/menu/${product.slug}`;
  const statusLabel = !product.isAvailable
    ? "Unavailable"
    : product.stockStatus === "out"
      ? "Sold out"
      : product.stockStatus === "low" && product.stockQuantity !== null
        ? `Only ${product.stockQuantity} left`
        : null;

  function quickAdd() {
    cart.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.imageUrl,
      optionIds: [],
      addonIds: [],
      quantity: 1,
      unitPriceCents: product.priceCents,
      summary: "",
    });
    toast.show(`${product.name} added to your order`);
  }

  // Pointer-driven 3D tilt (mouse/pen only; skipped when the visitor prefers reduced motion).
  function onTilt(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const el = e.currentTarget.style;
    el.setProperty("--tilt-x", `${(0.5 - y) * 9}deg`);
    el.setProperty("--tilt-y", `${(x - 0.5) * 11}deg`);
    el.setProperty("--glare-x", `${x * 100}%`);
    el.setProperty("--glare-y", `${y * 100}%`);
    el.setProperty("--glare", "1");
  }
  function resetTilt(e: React.PointerEvent<HTMLElement>) {
    const el = e.currentTarget.style;
    el.setProperty("--tilt-x", "0deg");
    el.setProperty("--tilt-y", "0deg");
    el.setProperty("--glare", "0");
  }

  return (
    <article
      onPointerMove={onTilt}
      onPointerLeave={resetTilt}
      className={cn(
        "tilt-card group relative flex h-full flex-col overflow-hidden rounded-[1.4rem] border border-cream-200 bg-white",
        "hover:border-gold-500/50 hover:shadow-[0_24px_50px_-28px_rgb(67_36_13/0.55)]",
        !product.isOrderable && "opacity-75",
      )}
    >
      <span className="tilt-glare" aria-hidden="true" />
      <Link href={href} className="relative block focus-visible:outline-offset-[-3px]" tabIndex={-1} aria-hidden="true">
        <ProductImage
          src={product.imageUrl}
          name={product.name}
          priority={priority}
          sizes="(min-width: 1280px) 300px, (min-width: 640px) 45vw, 92vw"
          className="aspect-[4/3] w-full transition duration-500 group-hover:scale-[1.03]"
          rounded="rounded-none"
        />
        {statusLabel && (
          <span
            className={cn(
              "chip absolute left-3 top-3 shadow-sm",
              product.isOrderable ? "bg-warning-50 text-warning-600" : "bg-espresso-900/90 text-cream-100",
            )}
          >
            {statusLabel}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[1.45rem] font-semibold leading-tight text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {product.description && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-muted">{product.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="text-lg font-bold tabular-nums text-walnut-700">
            {product.options.some((o) => o.priceDeltaCents > 0) && <span className="mr-1 text-xs font-medium text-ink-muted">from</span>}
            {formatPesoShort(product.priceCents)}
          </p>
          {orderingEnabled && product.isOrderable && (
            customizable ? (
              <Link href={href} className="btn btn-outline btn-sm relative z-10">
                Choose Options
              </Link>
            ) : (
              <button type="button" onClick={quickAdd} className="btn btn-espresso btn-sm relative z-10" aria-label={`Add ${product.name} to order`}>
                <Plus className="h-4 w-4" /> Add to Order
              </button>
            )
          )}
        </div>
      </div>
    </article>
  );
}
