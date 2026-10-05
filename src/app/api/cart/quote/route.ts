import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { describeSelection, resolveSelection } from "@/lib/pricing";
import { orderLineSchema } from "@/lib/validation";
import { loadProductsForPricing } from "@/server/menu";
import type { QuoteLine } from "@/lib/menu-types";

const bodySchema = z.object({ items: z.array(orderLineSchema).max(50) });

/**
 * Re-prices a cart against the live menu. The browser never decides prices; it shows what this
 * endpoint returns, and checkout re-validates again on the server.
 */
export async function POST(request: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
  }

  try {
    const db = await getDb();
    const products = await loadProductsForPricing(db, [...new Set(parsed.items.map((i) => i.productId))]);
    const lines: QuoteLine[] = parsed.items.map((item) => {
      const product = products.get(item.productId);
      if (!product) return { ok: false, productId: item.productId, name: null, error: "No longer on the menu." };
      if (!product.isAvailable || !product.isOrderable) {
        return {
          ok: false,
          productId: product.id,
          name: product.name,
          error: product.stockStatus === "out" ? "Sold out" : "Currently unavailable",
        };
      }
      const selection = resolveSelection(product, item.optionIds, item.addonIds);
      if (!selection.ok) return { ok: false, productId: product.id, name: product.name, error: selection.error };
      return {
        ok: true,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        imageUrl: product.imageUrl,
        unitPriceCents: selection.unitPriceCents,
        summary: describeSelection(selection.options, selection.addons),
        stockQuantity: product.stockQuantity,
      };
    });
    return NextResponse.json({ lines }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[cart quote]", error);
    return NextResponse.json({ error: "We couldn't load the latest menu prices." }, { status: 503 });
  }
}
