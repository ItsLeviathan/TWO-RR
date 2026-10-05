"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useToast } from "@/components/ui/Toast";
import type { MenuProduct } from "@/lib/menu-types";
import { formatPeso } from "@/lib/money";
import { ProductConfigurator } from "./ProductConfigurator";

/** Add a product to the cart — or, with ?edit=<line key>, update an existing cart line. */
export function ProductDetail({ product, disabledReason }: { product: MenuProduct; disabledReason: string | null }) {
  const cart = useCart();
  const toast = useToast();
  const router = useRouter();
  const editKey = useSearchParams().get("edit");
  const editing = editKey ? cart.lines.find((l) => l.key === editKey && l.productId === product.id) : undefined;

  if (!cart.hydrated) {
    return <div className="skeleton h-64" aria-busy="true" aria-label="Loading options" />;
  }

  return (
    <ProductConfigurator
      // Re-mount when switching between add and edit so the initial selection is applied.
      key={editing?.key ?? "new"}
      product={product}
      initial={editing ? { optionIds: editing.optionIds, addonIds: editing.addonIds, quantity: editing.quantity } : undefined}
      disabledReason={disabledReason}
      submitLabel={(total) => (editing ? `Update Order · ${formatPeso(total)}` : `Add to Order · ${formatPeso(total)}`)}
      onSubmit={(line) => {
        const next = {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          imageUrl: product.imageUrl,
          ...line,
        };
        if (editing) {
          cart.replace(editing.key, next);
          toast.show(`${product.name} updated`);
          router.push("/cart");
        } else {
          cart.add(next);
          toast.show(`${product.name} added to your order`);
          cart.setDrawerOpen(true);
        }
      }}
    />
  );
}
