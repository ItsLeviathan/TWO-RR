"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center" role="alert">
      <h1 className="display text-4xl">Something went wrong.</h1>
      <p className="mt-3 text-ink-muted">This page couldn&apos;t load. Please check your connection and try again.</p>
      <button type="button" className="btn btn-espresso mt-8" onClick={reset}>
        <RefreshCw className="h-4 w-4" /> Try Again
      </button>
    </div>
  );
}
