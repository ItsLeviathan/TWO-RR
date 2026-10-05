import { PageHeader } from "@/components/dashboard/PageHeader";
import { CategoryManager } from "@/components/menu/CategoryManager";
import { requirePage } from "@/server/auth";
import { listCategoriesWithCounts } from "@/server/admin-queries";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requirePage("categories.manage");
  const categories = await listCategoriesWithCounts();
  return (
    <>
      <PageHeader title="Categories" description="Sections of your menu, in the order customers and the POS see them." />
      <div className="max-w-3xl px-4 py-8 sm:px-8">
        <CategoryManager categories={categories} />
      </div>
    </>
  );
}
