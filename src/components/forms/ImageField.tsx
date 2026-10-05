"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { uploadImage } from "@/server/actions/upload";

/**
 * Image picker. With Vercel Blob configured, the owner uploads a file (stored persistently, not on
 * the server's disk). Without it, upload is clearly unavailable and an https:// link can be used.
 */
export function ImageField({
  id,
  label,
  value,
  onChange,
  folder,
  uploadsEnabled,
  previewName = "Image",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: "products" | "gallery" | "brand";
  uploadsEnabled: boolean;
  previewName?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showUrl, setShowUrl] = useState(!uploadsEnabled && Boolean(value));

  function upload(file: File) {
    setError(null);
    if (file.size > 4 * 1024 * 1024) {
      setError("Images must be 4 MB or smaller.");
      return;
    }
    const data = new FormData();
    data.set("file", file);
    data.set("folder", folder);
    startTransition(async () => {
      const result = await uploadImage(data);
      if (result.ok) onChange(result.data.url);
      else setError(result.error);
    });
  }

  return (
    <div>
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <ProductImage src={value || null} name={previewName} sizes="128px" className="h-32 w-32 shrink-0" rounded="rounded-2xl" />
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            {uploadsEnabled && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="sr-only"
                  id={`${id}-file`}
                  aria-labelledby={`${id}-label`}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload(file);
                    e.target.value = "";
                  }}
                />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()} disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {pending ? "Uploading…" : value ? "Replace image" : "Upload image"}
                </button>
              </>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowUrl((s) => !s)}>
              <Link2 className="h-4 w-4" /> {showUrl ? "Hide link" : "Use a link"}
            </button>
            {value && (
              <button type="button" className="btn btn-ghost btn-sm text-danger-600" onClick={() => onChange("")}>
                <Trash2 className="h-4 w-4" /> Remove
              </button>
            )}
          </div>
          {showUrl && (
            <div>
              <label htmlFor={`${id}-url`} className="sr-only">
                Image link
              </label>
              <input
                id={`${id}-url`}
                className="input"
                placeholder="https://…"
                value={value}
                onChange={(e) => onChange(e.target.value.trim())}
                inputMode="url"
              />
            </div>
          )}
          {!uploadsEnabled && (
            <p className="hint">
              Uploads are unavailable until Vercel Blob storage is connected (BLOB_READ_WRITE_TOKEN). You can paste an https:// image link
              instead.
            </p>
          )}
          {uploadsEnabled && <p className="hint">JPG, PNG, WebP or AVIF, up to 4 MB.</p>}
          {error && <p className="field-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
