import Image from "next/image";
import { cn, isOptimizableImage } from "@/lib/utils";

const DEFAULT_LOGO = "/brand/two-rr-logo-640.webp";
// The supplied TWO RR logo is a slightly tall circle (758 × 785 after trimming the background).
const RATIO = 785 / 758;

type LogoProps = {
  /** Owner-uploaded logo from Settings; falls back to the supplied TWO RR logo. */
  src?: string | null;
  size: number;
  priority?: boolean;
  className?: string;
  alt?: string;
};

export function Logo({ src, size, priority, className, alt = "TWO RR Coffee logo" }: LogoProps) {
  const url = src || DEFAULT_LOGO;
  return (
    <Image
      src={url}
      alt={alt}
      width={size}
      height={Math.round(size * RATIO)}
      priority={priority}
      unoptimized={!isOptimizableImage(url)}
      sizes={`${size}px`}
      className={cn("select-none object-contain", className)}
      draggable={false}
    />
  );
}
