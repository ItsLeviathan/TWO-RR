import Link from "next/link";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { InventoryTable } from "@/components/dashboard/InventoryTable";
import { EmptyState } from "@/components/ui/states";
import { requirePage } from "@/server/auth";
import { listInventory } from "@/server/admin-queries";

export const metadata = { title: "Inventory" };

export default async function InventoryPage() {
  await requirePage("inventory.manage");
  const items = await listInventory();
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock for products with tracking turned on. Sales deduct stock automatically; cancelling an order returns it."
      />
      <div className="px-4 py-8 sm:px-8">
        {items.length === 0 ? (
          <div className="card">
            <EmptyState
              title="No products are tracked."
              description="Turn on “Track stock” for items like pastries or bottled drinks in the product editor."
              action={
                <Link href="/admin/products" className="btn btn-espresso">
                  Go to Products
                </Link>
              }
            />
          </div>
        ) : (
          <InventoryTable items={items} />
        )}
      </div>
    </>
  );
}
