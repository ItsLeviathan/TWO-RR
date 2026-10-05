"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { ClockMark } from "@/components/branding/Ornaments";

export default function MenuError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-24 text-center" role="alert">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-gold-500/40 bg-cream-100">
        <ClockMark hour={9} className="h-8 w-8" />
      </div>
      <h1 className="display mt-6 text-4xl text-ink">Something went wrong.</h1>
      <p className="mt-3 text-ink-muted">We couldn&apos;t load the menu.</p>
      <button type="button" onClick={reset} className="btn btn-gold mt-8">
        <RefreshCw className="h-4 w-4" /> Try Again
      </button>
    </div>
  );
}
