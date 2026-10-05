import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProductForm } from "@/components/products/admin/ProductForm";
import { requirePage } from "@/server/auth";
import { getAdminProduct, listCategoriesWithCounts } from "@/server/admin-queries";
import { isUploadConfigured } from "@/server/storage";

export const metadata = { title: "Edit Product" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  await requirePage("products.manage");
  const { id } = await props.params;
  if (!UUID.test(id)) notFound();
  const [product, categories] = await Promise.all([getAdminProduct(id), listCategoriesWithCounts()]);
  if (!product) notFound();
  return (
    <>
      <PageHeader
        title={product.name}
        description="Edit product details, price, options and availability."
        actions={
          <>
            <Link href="/admin/products" className="btn btn-outline">
              <ChevronLeft className="h-4 w-4" /> Products
            </Link>
            <Link href={`/menu/${product.slug}`} target="_blank" className="btn btn-ghost">
              <ExternalLink className="h-4 w-4" /> View on menu
            </Link>
          </>
        }
      />
      <div className="px-4 py-8 sm:px-8">
        <ProductForm product={product} categories={categories} uploadsEnabled={isUploadConfigured()} />
      </div>
    </>
  );
}
