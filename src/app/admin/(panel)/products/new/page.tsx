import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProductForm } from "@/components/products/admin/ProductForm";
import { requirePage } from "@/server/auth";
import { listCategoriesWithCounts } from "@/server/admin-queries";
import { isUploadConfigured } from "@/server/storage";

export const metadata = { title: "Add Product" };

export default async function NewProductPage() {
  await requirePage("products.manage");
  const categories = await listCategoriesWithCounts();
  if (categories.length === 0) redirect("/admin/categories");
  return (
    <>
      <PageHeader
        title="Add Product"
        actions={
          <Link href="/admin/products" className="btn btn-outline">
            <ChevronLeft className="h-4 w-4" /> Products
          </Link>
        }
      />
      <div className="px-4 py-8 sm:px-8">
        <ProductForm product={null} categories={categories} uploadsEnabled={isUploadConfigured()} />
      </div>
    </>
  );
}
