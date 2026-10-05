import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { GoldRule } from "@/components/branding/Ornaments";
import { ProductDetail } from "@/components/products/ProductDetail";
import { ProductImage } from "@/components/ui/ProductImage";
import { formatPeso } from "@/lib/money";
import { getProductBySlug } from "@/server/menu";
import { getSettings } from "@/server/settings";

export async function generateMetadata(props: PageProps<"/menu/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  return product ? { title: product.name, description: product.description || undefined } : { title: "Not found" };
}

export default async function ProductPage(props: PageProps<"/menu/[slug]">) {
  const { slug } = await props.params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) notFound();

  const disabledReason = !settings.onlineOrderingEnabled
    ? "Online ordering is paused right now. Please order at the counter."
    : !product.isAvailable
      ? "This item is currently unavailable."
      : product.stockStatus === "out"
        ? "Sold out for now."
        : null;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8 lg:pt-10">
      <Link href="/menu" className="btn btn-ghost btn-sm -ml-3">
        <ChevronLeft className="h-4 w-4" /> Back to menu
      </Link>
      <div className="mt-4 grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <ProductImage
            src={product.imageUrl}
            name={product.name}
            priority
            sizes="(min-width: 1024px) 600px, 100vw"
            className="aspect-square w-full animate-fade-in shadow-[0_30px_60px_-35px_rgb(67_36_13/0.6)]"
            rounded="rounded-[2rem]"
          />
        </div>
        <div className="animate-fade-up">
          <p className="eyebrow text-gold-700">{product.categoryName}</p>
          <h1 className="display mt-3 text-5xl text-ink sm:text-6xl">{product.name}</h1>
          <p className="mt-4 text-2xl font-bold tabular-nums text-walnut-700">{formatPeso(product.priceCents)}</p>
          {product.description && <p className="mt-5 max-w-prose text-lg leading-relaxed text-ink-soft">{product.description}</p>}
          <GoldRule className="my-8 max-w-[12rem]" />
          <ProductDetail product={product} disabledReason={disabledReason} />
        </div>
      </div>
    </div>
  );
}
