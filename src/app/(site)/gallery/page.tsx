import type { Metadata } from "next";
import { SectionHeading } from "@/components/branding/SectionHeading";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { EmptyState } from "@/components/ui/states";
import { getGalleryImages } from "@/server/gallery";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Gallery" };

export default async function GalleryPage() {
  const [settings, images] = await Promise.all([getSettings(), getGalleryImages()]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <SectionHeading
        as="h1"
        hour={6}
        eyebrow="Gallery"
        title={`Moments at ${settings.businessName}`}
        description="Coffee, food and the people and places that make the shop."
      />
      {images.length === 0 ? (
        <EmptyState title="Photos coming soon." description="We're getting the camera ready. Check back for a look inside." />
      ) : (
        <GalleryGrid images={images} />
      )}
    </div>
  );
}
