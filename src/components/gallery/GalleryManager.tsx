"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Loader2, Trash2 } from "lucide-react";
import { ImageField } from "@/components/forms/ImageField";
import { ProductImage } from "@/components/ui/ProductImage";
import { EmptyState, ErrorMessage } from "@/components/ui/states";
import { useToast } from "@/components/ui/Toast";
import { GALLERY_CATEGORIES, type GalleryCategory } from "@/db/schema";
import { addGalleryImage, deleteGalleryImage, moveGalleryImage } from "@/server/actions/gallery";
import type { ActionResult } from "@/server/result";

type Img = { id: string; url: string; alt: string; caption: string | null; category: GalleryCategory };

const LABEL: Record<GalleryCategory, string> = {
  coffee: "Coffee",
  food: "Food",
  interior: "Interior",
  exterior: "Exterior",
  staff: "Staff",
  atmosphere: "Atmosphere",
};

export function GalleryManager({ images, uploadsEnabled }: { images: Img[]; uploadsEnabled: boolean }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<GalleryCategory>("coffee");

  function run(action: () => Promise<ActionResult<null>>, success: string, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.show(success);
        after?.();
      } else setError(result.error);
    });
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[24rem_1fr]">
      <form
        className="card h-fit space-y-4 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => addGalleryImage({ url, alt, caption, category }), "Photo added", () => {
            setUrl("");
            setAlt("");
            setCaption("");
          });
        }}
      >
        <h2 className="display text-2xl">Add a photo</h2>
        <ImageField id="gallery-image" label="Photo" value={url} onChange={setUrl} folder="gallery" uploadsEnabled={uploadsEnabled} previewName={alt || "Photo"} />
        <div>
          <label htmlFor="g-alt" className="label">
            Description
          </label>
          <input id="g-alt" className="input" value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={160} placeholder="Iced latte on the counter" />
          <p className="hint mt-1">Describes the photo for people using screen readers.</p>
        </div>
        <div>
          <label htmlFor="g-caption" className="label">
            Caption <span className="font-normal text-ink-muted">(optional)</span>
          </label>
          <input id="g-caption" className="input" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={160} />
        </div>
        <div>
          <label htmlFor="g-category" className="label">
            Category
          </label>
          <select id="g-category" className="input" value={category} onChange={(e) => setCategory(e.target.value as GalleryCategory)}>
            {GALLERY_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <button type="submit" className="btn btn-gold w-full" disabled={pending || !url || !alt.trim()}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />} Add to Gallery
        </button>
      </form>

      <div className="card overflow-hidden">
        {images.length === 0 ? (
          <EmptyState title="No photos yet." description="Photos you add appear on the public Gallery page and home page." />
        ) : (
          <ul className="divide-y divide-cream-200">
            {images.map((img, i) => (
              <li key={img.id} className="flex items-center gap-4 px-4 py-3">
                <ProductImage src={img.url} name={img.alt} sizes="64px" className="h-16 w-16 shrink-0" rounded="rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{img.alt}</p>
                  <p className="text-sm text-ink-muted">
                    {LABEL[img.category]}
                    {img.caption && ` · ${img.caption}`}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  aria-label="Move up"
                  disabled={pending || i === 0}
                  onClick={() => run(() => moveGalleryImage({ id: img.id, direction: "up" }), "Order updated")}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  aria-label="Move down"
                  disabled={pending || i === images.length - 1}
                  onClick={() => run(() => moveGalleryImage({ id: img.id, direction: "down" }), "Order updated")}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon text-danger-600"
                  aria-label={`Delete photo ${img.alt}`}
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm("Delete this photo?")) run(() => deleteGalleryImage(img.id), "Photo deleted");
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
