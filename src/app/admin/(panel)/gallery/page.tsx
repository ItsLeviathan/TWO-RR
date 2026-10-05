import { PageHeader } from "@/components/dashboard/PageHeader";
import { GalleryManager } from "@/components/gallery/GalleryManager";
import { requirePage } from "@/server/auth";
import { getGalleryImages } from "@/server/gallery";
import { isUploadConfigured } from "@/server/storage";

export const metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  await requirePage("gallery.manage");
  const images = await getGalleryImages();
  return (
    <>
      <PageHeader title="Gallery" description="Photos of your coffee, food, shop and team, shown on the public Gallery page." />
      <div className="px-4 py-8 sm:px-8">
        <GalleryManager images={images} uploadsEnabled={isUploadConfigured()} />
      </div>
    </>
  );
}
