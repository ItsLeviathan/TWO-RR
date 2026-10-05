import type { PricedAddon, PricedOption } from "./pricing";

export type StockStatus = "untracked" | "in" | "low" | "out";

/** Serializable product shape shared by the public menu, product details, cart and POS. */
export type MenuProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  categoryId: string;
  categoryName: string;
  isFeatured: boolean;
  isAvailable: boolean;
  isOrderable: boolean;
  stockStatus: StockStatus;
  stockQuantity: number | null;
  options: PricedOption[];
  addons: PricedAddon[];
};

export type MenuCategory = {
  id: string;
  name: string;
  slug: string;
  products: MenuProduct[];
};

export const hasCustomizations = (p: Pick<MenuProduct, "options" | "addons">) =>
  p.options.length > 0 || p.addons.some((a) => a.isAvailable);

export type QuoteLine =
  | {
      ok: true;
      productId: string;
      slug: string;
      name: string;
      imageUrl: string | null;
      unitPriceCents: number;
      summary: string;
      /** Remaining stock when the product tracks inventory. */
      stockQuantity: number | null;
    }
  | { ok: false; productId: string; name: string | null; error: string };
