import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ProductTable } from "@/components/products/admin/ProductTable";
import { EmptyState } from "@/components/ui/states";
import { can } from "@/lib/permissions";
import { requirePage } from "@/server/auth";
import { listAdminProducts, listCategoriesWithCounts } from "@/server/admin-queries";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const user = await requirePage("products.view");
  const canManage = can(user.role, "products.manage");
  const [products, categories] = await Promise.all([listAdminProducts(), listCategoriesWithCounts()]);
  return (
    <>
      <PageHeader
        title="Products"
        description={
          canManage
            ? "Everything on your menu. Changes appear on the website and POS immediately."
            : "The menu with current availability and stock. Ask the owner to change products or prices."
        }
        actions={
          canManage && categories.length > 0 ? (
            <Link href="/admin/products/new" className="btn btn-gold">
              <Plus className="h-4 w-4" /> Add Product
            </Link>
          ) : null
        }
      />
      <div className="px-4 py-8 sm:px-8">
        {categories.length === 0 && canManage ? (
          <div className="card">
            <EmptyState
              title="Create a category first."
              description="Products belong to categories like Coffee or Pastries."
              action={
                <Link href="/admin/categories" className="btn btn-espresso">
                  Manage Categories
                </Link>
              }
            />
          </div>
        ) : products.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No products yet."
              description="Add your first product to start building the menu."
              action={
                canManage ? (
                  <Link href="/admin/products/new" className="btn btn-gold">
                    <Plus className="h-4 w-4" /> Add Product
                  </Link>
                ) : undefined
              }
            />
          </div>
        ) : (
          <ProductTable products={products} categories={categories.map((c) => ({ id: c.id, name: c.name }))} readOnly={!canManage} />
        )}
      </div>
    </>
  );
}
