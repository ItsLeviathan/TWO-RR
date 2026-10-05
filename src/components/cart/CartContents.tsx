"use client";

import Link from "next/link";
import { AlertTriangle, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/ui/ProductImage";
import { QuantityStepper } from "@/components/ui/controls";
import { EmptyState } from "@/components/ui/states";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { useCart, useCartQuote } from "./CartProvider";

/** The order summary used by both the cart drawer and the /cart page. */
export function CartContents({ onNavigate, variant = "drawer" }: { onNavigate?: () => void; variant?: "drawer" | "page" }) {
  const cart = useCart();
  const quote = useCartQuote(cart.lines, cart.hydrated);

  if (!cart.hydrated) {
    return (
      <div className="space-y-4 p-5" aria-busy="true" aria-label="Loading your order">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="skeleton h-20 w-20" />
            <div className="flex-1 space-y-2 py-1">
              <div className="skeleton h-4 w-2/3" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty."
        description="Browse the TWO RR menu and add something you love."
        action={
          <Link href="/menu" className="btn btn-espresso" onClick={onNavigate}>
            Browse Menu
          </Link>
        }
      />
    );
  }

  const quoteReady = quote.status === "ready" && quote.quote?.length === cart.lines.length;
  const subtotal = quoteReady
    ? quote.totalCents
    : cart.lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const canCheckout = quoteReady && quote.problems === 0 && subtotal > 0;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", variant === "page" && "gap-6 lg:flex-row lg:items-start")}>
      <ul className={cn("min-h-0 flex-1 divide-y divide-cream-200 overflow-y-auto px-5", variant === "page" && "card px-5 lg:px-6")}>
        {cart.lines.map((line, index) => {
          const q = quoteReady ? quote.quote![index] : undefined;
          const problem = q && !q.ok ? q.error : null;
          const unit = q && q.ok ? q.unitPriceCents : line.unitPriceCents;
          return (
            <li key={line.key} className="flex gap-4 py-4">
              <ProductImage src={line.imageUrl} name={line.name} sizes="80px" className="h-20 w-20 shrink-0" rounded="rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug text-ink">{line.name}</p>
                    {line.summary && <p className="mt-0.5 text-sm text-ink-muted">{line.summary}</p>}
                  </div>
                  <p className={cn("shrink-0 font-semibold tabular-nums", problem && "text-ink-muted line-through")}>
                    {formatPeso(unit * line.quantity)}
                  </p>
                </div>
                <p className="mt-0.5 text-xs text-ink-muted tabular-nums">
                  {line.quantity} × {formatPeso(unit)}
                </p>
                {problem && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-danger-600">
                    <AlertTriangle className="h-4 w-4" aria-hidden /> {problem}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <QuantityStepper
                    size="sm"
                    value={line.quantity}
                    max={q && q.ok && q.stockQuantity !== null ? Math.max(1, Math.min(99, q.stockQuantity)) : 99}
                    onChange={(n) => cart.setQuantity(line.key, n)}
                    label={`Quantity of ${line.name}`}
                  />
                  <Link
                    href={`/menu/${line.slug}?edit=${line.key}`}
                    onClick={onNavigate}
                    className="btn btn-ghost btn-sm px-3"
                    aria-label={`Edit options for ${line.name}`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => cart.remove(line.key)}
                    className="btn btn-ghost btn-sm px-3 text-danger-600"
                    aria-label={`Remove ${line.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={cn(
          "border-t border-cream-200 bg-cream-50 px-5 pb-5 pt-4",
          variant === "page" && "card w-full border-t-0 p-6 lg:sticky lg:top-24 lg:w-96",
        )}
      >
        {quote.status === "error" && (
          <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-danger-50 px-3 py-2 text-sm text-danger-600">
            We couldn&apos;t check the latest prices.
            <button type="button" className="btn btn-ghost btn-sm" onClick={quote.retry}>
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </button>
          </div>
        )}
        {quoteReady && quote.problems > 0 && (
          <p role="alert" className="mb-3 rounded-xl bg-warning-50 px-3 py-2 text-sm text-warning-600">
            Please remove or edit the items marked above before checking out.
          </p>
        )}
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between text-ink-soft">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPeso(subtotal)}</dd>
          </div>
          <div className="flex justify-between pt-1 text-lg font-bold text-ink">
            <dt>Total</dt>
            <dd className="tabular-nums" aria-live="polite">
              {formatPeso(subtotal)}
            </dd>
          </div>
        </dl>
        <Link
          href={canCheckout ? "/checkout" : "#"}
          aria-disabled={!canCheckout}
          tabIndex={canCheckout ? undefined : -1}
          onClick={(e) => {
            if (!canCheckout) e.preventDefault();
            else onNavigate?.();
          }}
          className="btn btn-gold btn-lg mt-4 w-full"
        >
          {quote.status === "loading" ? "Checking prices…" : "Checkout"}
        </Link>
        <div className="mt-3 flex items-center justify-between">
          <Link href="/menu" onClick={onNavigate} className="text-sm font-medium text-gold-700 underline-offset-4 hover:underline">
            Add more items
          </Link>
          <button
            type="button"
            className="text-sm font-medium text-ink-muted underline-offset-4 hover:text-danger-600 hover:underline"
            onClick={() => {
              if (window.confirm("Remove everything from your order?")) cart.clear();
            }}
          >
            Clear cart
          </button>
        </div>
      </div>
    </div>
  );
}
