import Image from "next/image";
import { Bean } from "@/components/branding/Ornaments";
import { cn, isOptimizableImage } from "@/lib/utils";

/**
 * Product photo, or — when the owner hasn't added one yet — a branded placeholder
 * (parchment dial with the product's initial). Placeholders are clearly not photos.
 */
export function ProductImage({
  src,
  name,
  sizes,
  className,
  priority,
  rounded = "rounded-2xl",
}: {
  src: string | null;
  name: string;
  sizes: string;
  className?: string;
  priority?: boolean;
  rounded?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative overflow-hidden bg-cream-100", rounded, className)}>
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={!isOptimizableImage(src)}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,var(--color-cream-100),var(--color-cream-200))]",
        rounded,
        className,
      )}
      role="img"
      aria-label={`${name} — photo coming soon`}
    >
      <div className="absolute inset-[14%] rounded-full border border-gold-500/30" />
      <div className="absolute inset-[22%] rounded-full border border-dashed border-gold-500/25" />
      <div className="relative flex flex-col items-center gap-1 text-gold-600">
        <span className="font-display text-5xl font-semibold leading-none text-walnut-700/80">
          {name.trim().charAt(0).toUpperCase()}
        </span>
        <Bean className="h-2.5 text-gold-500/80" />
      </div>
    </div>
  );
}
