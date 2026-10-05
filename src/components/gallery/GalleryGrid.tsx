"use client";

import Image from "next/image";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { GalleryCategory } from "@/db/schema";
import { cn, isOptimizableImage } from "@/lib/utils";

type Img = { id: string; url: string; alt: string; caption: string | null; category: GalleryCategory };

const LABEL: Record<GalleryCategory, string> = {
  coffee: "Coffee",
  food: "Food",
  interior: "Interior",
  exterior: "Exterior",
  staff: "Staff",
  atmosphere: "Atmosphere",
};

export function GalleryGrid({ images }: { images: Img[] }) {
  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const present = (Object.keys(LABEL) as GalleryCategory[]).filter((c) => images.some((i) => i.category === c));
  const visible = filter === "all" ? images : images.filter((i) => i.category === filter);
  const current = openIndex !== null ? visible[openIndex] : undefined;

  const step = (delta: number) =>
    setOpenIndex((i) => (i === null ? i : (i + delta + visible.length) % visible.length));

  return (
    <>
      {present.length > 1 && (
        <div role="group" aria-label="Filter photos" className="scrollbar-none mt-8 flex gap-2 overflow-x-auto">
          {(["all", ...present] as const).map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={filter === c}
              onClick={() => setFilter(c)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition",
                filter === c ? "border-espresso-900 bg-espresso-900 text-gold-200" : "border-cream-300 bg-white text-ink-soft hover:border-gold-500",
              )}
            >
              {c === "all" ? "All" : LABEL[c]}
            </button>
          ))}
        </div>
      )}

      <ul key={filter} className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {visible.map((img, i) => (
          <li key={img.id} className="mb-4 break-inside-avoid animate-fade-up" style={{ animationDelay: `${Math.min(i, 9) * 40}ms` }}>
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              className="group relative block w-full overflow-hidden rounded-2xl bg-cream-100 text-left"
              aria-label={`View photo: ${img.alt}`}
            >
              <Image
                src={img.url}
                alt={img.alt}
                width={800}
                height={800}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                unoptimized={!isOptimizableImage(img.url)}
                className="h-auto w-full transition duration-700 group-hover:scale-[1.03]"
              />
              {img.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-espresso-950/80 to-transparent px-4 pb-3 pt-10 text-sm text-cream-50 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  {img.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <Modal open={current !== undefined} onClose={() => setOpenIndex(null)} title={current?.alt ?? "Photo"} hideTitle className="sm:max-w-4xl">
        {current && (
          <figure className="relative">
            <Image
              src={current.url}
              alt={current.alt}
              width={1600}
              height={1200}
              sizes="(min-width: 1024px) 900px, 100vw"
              unoptimized={!isOptimizableImage(current.url)}
              className="max-h-[78dvh] w-full bg-espresso-950 object-contain"
            />
            <figcaption className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="text-sm text-ink-soft">{current.caption ?? current.alt}</span>
              {visible.length > 1 && (
                <span className="flex gap-2">
                  <button type="button" className="btn btn-outline btn-icon" onClick={() => step(-1)} aria-label="Previous photo">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button type="button" className="btn btn-outline btn-icon" onClick={() => step(1)} aria-label="Next photo">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </span>
              )}
            </figcaption>
          </figure>
        )}
      </Modal>
    </>
  );
}
