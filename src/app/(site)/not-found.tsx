import Link from "next/link";
import { ClockMark } from "@/components/branding/Ornaments";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold-500/40 bg-cream-100">
        <ClockMark hour={4} className="h-8 w-8" />
      </div>
      <h1 className="display mt-6 text-4xl text-ink">We couldn&apos;t find that.</h1>
      <p className="mt-3 text-ink-muted">The page or item may have moved or is no longer on the menu.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/menu" className="btn btn-gold">
          Browse Menu
        </Link>
        <Link href="/" className="btn btn-outline">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
